import { Env, NotionBlock } from '../types';
import { errorResponse, JSON_HEADERS } from '../utils/response';
import { notionFetch } from '../utils/notion';

export function simplifyArticleBlocks(blocks: NotionBlock[]) {
  return blocks.map((block) => {
    const type = block.type;
    const content = block[type];

    const simplified: any = { type, id: block.id };

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
      simplified.text =
        content.rich_text?.map((t: any) => t.plain_text).join('') || '';
    } else if (type === 'image') {
      simplified.url = content.external?.url || content.file?.url || '';
      simplified.caption =
        content.caption?.map((t: any) => t.plain_text).join('') || '';
    }

    return simplified;
  });
}

export async function fetchArticleBlocks(
  articleId: string,
  env: Env
): Promise<ReturnType<typeof simplifyArticleBlocks>> {
  const response = await notionFetch(`/v1/blocks/${articleId}/children`, env);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch article content (${response.status}): ${errorData}`
    );
  }

  const data = (await response.json()) as { results: NotionBlock[] };
  return simplifyArticleBlocks(data.results);
}

export async function handleArticleDetail(
  articleId: string,
  env: Env
): Promise<Response> {
  try {
    const blocks = await fetchArticleBlocks(articleId, env);
    return new Response(JSON.stringify({ blocks }, null, 2), {
      headers: JSON_HEADERS
    });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
