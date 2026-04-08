import { Env, NotionBlock, NotionPage, NotionResponse } from '../types';
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
  slug: string;
  title: string;
  blocks: SimplifiedBlock[];
};

function getPlainText(richText?: any[]): string {
  return richText?.map((item: any) => item.plain_text).join('') || '';
}

function normalizeNotionId(value: string): string {
  return value.replace(/-/g, '').toLowerCase();
}

function looksLikeNotionId(value: string): boolean {
  return /^[a-f0-9]{32}$/i.test(normalizeNotionId(value));
}

async function fetchPageById(articleId: string, env: Env): Promise<NotionPage> {
  const response = await notionFetch(`/v1/pages/${articleId}`, env);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch article page (${response.status}): ${errorData}`
    );
  }

  return (await response.json()) as NotionPage;
}

async function fetchPageBySlug(slug: string, env: Env): Promise<NotionPage> {
  const articleDataSourceId = await getEnvValue(env, 'ARTICLE_DATA_SOURCE_ID');

  if (!articleDataSourceId) {
    throw new Error('Missing ARTICLE_DATA_SOURCE_ID secret.');
  }

  const response = await notionFetch(
    `/v1/data_sources/${articleDataSourceId}/query`,
    env,
    {
      method: 'POST',
      body: JSON.stringify({
        page_size: 2,
        filter: {
          property: 'Slug',
          rich_text: {
            equals: slug
          }
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch article by slug (${response.status}): ${errorData}`
    );
  }

  const data = (await response.json()) as NotionResponse;
  const page = data.results[0];

  if (!page) {
    throw new Error(`Article slug "${slug}" was not found.`);
  }

  return page;
}

async function resolveArticlePage(
  identifier: string,
  env: Env
): Promise<NotionPage> {
  if (looksLikeNotionId(identifier)) {
    try {
      return await fetchPageById(identifier, env);
    } catch (error) {
      return fetchPageBySlug(identifier, env);
    }
  }

  return fetchPageBySlug(identifier, env);
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
        content.cells?.map((cell: any[]) =>
          cell.map((item: any) => item.plain_text || '')
        ) || [];
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
  identifier: string,
  env: Env
): Promise<ArticleDetailData> {
  const page = await resolveArticlePage(identifier, env);
  const articleId = page.id;
  const slug = getPlainText(page.properties.Slug?.rich_text) || normalizeNotionId(articleId);

  const [title, blocks] = await Promise.all([
    Promise.resolve(page.properties.Title?.title?.[0]?.plain_text || 'Untitled'),
    fetchArticleBlocks(articleId, env)
  ]);

  return {
    id: articleId,
    slug,
    title,
    blocks
  };
}

export async function handleArticleDetail(
  identifier: string,
  env: Env
): Promise<Response> {
  try {
    const article = await fetchArticleDetailData(identifier, env);
    return new Response(JSON.stringify(article, null, 2), {
      headers: JSON_HEADERS
    });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
