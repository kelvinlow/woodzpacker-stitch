import { Env, NotionResponse } from '../types';
import { errorResponse, JSON_HEADERS } from '../utils/response';
import { notionFetch } from '../utils/notion';

export async function handleFeed(env: Env): Promise<Response> {
  const { ARTICLE_DATA_SOURCE_ID } = env;

  if (!ARTICLE_DATA_SOURCE_ID) {
    return errorResponse('Missing ARTICLE_DATA_SOURCE_ID secret.');
  }

  try {
    const response = await notionFetch(
      `/v1/data_sources/${ARTICLE_DATA_SOURCE_ID}/query`,
      env,
      {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            property: 'Published',
            checkbox: {
              equals: true
            }
          },
          sorts: [
            {
              property: 'Created Time',
              direction: 'descending'
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return errorResponse('Failed to fetch from Notion', errorData, response.status);
    }

    const data = (await response.json()) as NotionResponse;

    const simplifiedResults = data.results.map((page) => {
      const props = page.properties;

      return {
        id: page.id,
        title: props.Title?.title?.[0]?.plain_text || 'Untitled',
        description: props.Description?.rich_text?.[0]?.plain_text || '',
        slug: props.Slug?.rich_text?.[0]?.plain_text || '',
        thumbnail: props.Thumbnail?.url || null,
        category: props.Category?.select?.name || null,
        createdAt: props['Created Time']?.date?.start || null,
        published: props.Published?.checkbox ?? false,
        notionUrl: page.url
      };
    });

    return new Response(JSON.stringify(simplifiedResults, null, 2), {
      headers: JSON_HEADERS
    });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
