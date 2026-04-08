import { Env, NotionBlock, NotionResponse } from '../types';
import { errorResponse, JSON_HEADERS } from '../utils/response';
import { getEnvValue } from '../utils/env';
import { notionFetch } from '../utils/notion';

type SimplifiedBlock = {
  type: string;
  id: string;
  text?: string;
  url?: string;
  caption?: string;
  cells?: string[][];
  has_children?: boolean;
  children?: SimplifiedBlock[];
};

type ArticleDetailData = {
  id: string;
  title: string;
  blocks: SimplifiedBlock[];
};

function normalizeNotionId(value: string): string {
  return value.replace(/-/g, '').toLowerCase();
}

function getPlainText(richText?: any[]): string {
  return richText?.map((item: any) => item.plain_text).join('') || '';
}

async function fetchArticleTitle(articleId: string, env: Env): Promise<string> {
  const articleDataSourceId = await getEnvValue(env, 'ARTICLE_DATA_SOURCE_ID');

  if (!articleDataSourceId) {
    throw new Error('Missing ARTICLE_DATA_SOURCE_ID secret.');
  }

  let nextCursor: string | undefined;

  while (true) {
    const response = await notionFetch(
      `/v1/data_sources/${articleDataSourceId}/query`,
      env,
      {
        method: 'POST',
        body: JSON.stringify({
          page_size: 100,
          ...(nextCursor ? { start_cursor: nextCursor } : {})
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Failed to fetch article title (${response.status}): ${errorData}`
      );
    }

    const data = (await response.json()) as NotionResponse & {
      has_more?: boolean;
      next_cursor?: string | null;
    };
    const matchedPage = data.results.find(
      (page) => normalizeNotionId(page.id) === normalizeNotionId(articleId)
    );

    if (matchedPage) {
      return matchedPage.properties.Title?.title?.[0]?.plain_text || 'Untitled';
    }

    if (!data.has_more || !data.next_cursor) {
      break;
    }

    nextCursor = data.next_cursor;
  }

  throw new Error(`Article ${articleId} was not found in the data source.`);
}

async function fetchBlockChildren(
  blockId: string,
  env: Env
): Promise<NotionBlock[]> {
  const response = await notionFetch(`/v1/blocks/${blockId}/children`, env);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch child blocks for ${blockId} (${response.status}): ${errorData}`
    );
  }

  const data = (await response.json()) as { results: NotionBlock[] };
  return data.results;
}

async function hydrateBlocks(
  blocks: NotionBlock[],
  env: Env
): Promise<NotionBlock[]> {
  return Promise.all(
    blocks.map(async (block) => {
      if (!block.has_children) {
        return block;
      }

      const children = await fetchBlockChildren(block.id, env);
      return {
        ...block,
        children: await hydrateBlocks(children, env)
      };
    })
  );
}

function simplifyArticleBlocks(blocks: any[]): SimplifiedBlock[] {
  return blocks.map((block) => {
    const type = block.type;
    const content = block[type];

    const simplified: SimplifiedBlock = {
      type,
      id: block.id,
      has_children: Boolean(block.has_children)
    };

    if (
      [
        'paragraph',
        'heading_1',
        'heading_2',
        'heading_3',
        'bulleted_list_item',
        'numbered_list_item'
      ].includes(type)
    ) {
      simplified.text = getPlainText(content.rich_text);
    } else if (type === 'image') {
      simplified.url = content.external?.url || content.file?.url || '';
      simplified.caption = getPlainText(content.caption);
    } else if (type === 'table_row') {
      simplified.cells =
        content.cells?.map((cell: any[]) => cell.map((item: any) => item.plain_text || '')) || [];
    }

    if (Array.isArray(block.children) && block.children.length > 0) {
      simplified.children = simplifyArticleBlocks(block.children);
    }

    return simplified;
  });
}

async function fetchArticleBlocks(
  articleId: string,
  env: Env
): Promise<SimplifiedBlock[]> {
  const response = await notionFetch(`/v1/blocks/${articleId}/children`, env);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch article content (${response.status}): ${errorData}`
    );
  }

  const data = (await response.json()) as { results: NotionBlock[] };
  const hydratedBlocks = await hydrateBlocks(data.results, env);
  return simplifyArticleBlocks(hydratedBlocks);
}

export async function fetchArticleDetailData(
  articleId: string,
  env: Env
): Promise<ArticleDetailData> {
  const [title, blocks] = await Promise.all([
    fetchArticleTitle(articleId, env),
    fetchArticleBlocks(articleId, env)
  ]);

  return {
    id: articleId,
    title,
    blocks
  };
}

export async function handleArticleDetail(
  articleId: string,
  env: Env
): Promise<Response> {
  try {
    const article = await fetchArticleDetailData(articleId, env);
    return new Response(JSON.stringify(article, null, 2), {
      headers: JSON_HEADERS
    });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
