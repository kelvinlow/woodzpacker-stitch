import { Env, NotionResponse } from '../types';
import { errorResponse, JSON_HEADERS } from '../utils/response';
import { getEnvValue } from '../utils/env';
import { notionFetch } from '../utils/notion';

type FeedQueryResult = NotionResponse & {
  has_more?: boolean;
  next_cursor?: string | null;
};

export async function handleFeed(
  env: Env,
  pageNumber = 1,
  pageSize = 8
): Promise<Response> {
  const articleDataSourceId = await getEnvValue(env, 'ARTICLE_DATA_SOURCE_ID');

  if (!articleDataSourceId) {
    return errorResponse('Missing ARTICLE_DATA_SOURCE_ID secret.');
  }

  try {
    const safePageNumber = Math.max(1, Math.floor(pageNumber) || 1);
    const safePageSize = Math.max(1, Math.min(100, Math.floor(pageSize) || 8));
    const targetCount = safePageNumber * safePageSize;

    let allResults: NotionResponse['results'] = [];
    let nextCursor: string | undefined;
    let hasMore = true;

    while (hasMore && allResults.length < targetCount) {
      const response = await notionFetch(
        `/v1/data_sources/${articleDataSourceId}/query`,
        env,
        {
          method: 'POST',
          body: JSON.stringify({
            page_size: Math.min(100, targetCount - allResults.length),
            ...(nextCursor ? { start_cursor: nextCursor } : {}),
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
        return errorResponse(
          'Failed to fetch from Notion',
          errorData,
          response.status
        );
      }

      const data = (await response.json()) as FeedQueryResult;
      allResults = allResults.concat(data.results);
      hasMore = Boolean(data.has_more && data.next_cursor);
      nextCursor = data.next_cursor || undefined;
    }

    const startIndex = (safePageNumber - 1) * safePageSize;
    const paginatedResults = allResults.slice(startIndex, startIndex + safePageSize);

    const simplifiedResults = paginatedResults.map((page) => {
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

    return new Response(
      JSON.stringify(
        {
          pageNumber: safePageNumber,
          pageSize: safePageSize,
          hasMore: allResults.length > startIndex + safePageSize || hasMore,
          items: simplifiedResults
        },
        null,
        2
      ),
      {
      headers: JSON_HEADERS
      }
    );
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
