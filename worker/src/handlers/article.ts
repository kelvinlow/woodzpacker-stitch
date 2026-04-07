import { Env, NotionBlock } from '../types';
import { errorResponse, JSON_HEADERS } from '../utils/response';
import { notionFetch } from '../utils/notion';

export async function handleArticleDetail(
  articleId: string,
  env: Env
): Promise<Response> {
  try {
    const response = await notionFetch(
      `/v1/blocks/${articleId}/children`,
      env
    );

    if (!response.ok) {
      const errorData = await response.text();
      return errorResponse('Failed to fetch article content', errorData, response.status);
    }

    const data = (await response.json()) as { results: NotionBlock[] };

    const simplifiedBlocks = data.results.map((block) => {
      const type = block.type;
      const content = block[type];

      let simplified: any = { type, id: block.id };

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

    return new Response(JSON.stringify({ blocks: simplifiedBlocks }, null, 2), {
      headers: JSON_HEADERS
    });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
