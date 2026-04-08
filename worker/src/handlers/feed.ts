import { Env, NotionPage, NotionResponse } from '../types';
import { errorResponse, jsonResponse } from '../utils/response';
import { getEnvValue } from '../utils/env';
import { notionFetch } from '../utils/notion';

type FeedQueryResult = NotionResponse & {
  has_more?: boolean;
  next_cursor?: string | null;
};

type ArticleListItem = {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail: string | null;
  category: string | null;
  createdAt: string | null;
  published: boolean;
  notionUrl: string;
};

type ArticleQueryOptions = {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  category?: string;
};

type ArticleCollectionResponse = {
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
  availableCategories: string[];
  items: ArticleListItem[];
};

function getPlainText(richText?: any[]): string {
  return richText?.map((item: any) => item.plain_text || '').join('') || '';
}

function simplifyArticle(page: NotionPage): ArticleListItem {
  const props = page.properties;

  return {
    id: page.id,
    title: getPlainText(props.Title?.title) || 'Untitled',
    description: getPlainText(props.Description?.rich_text),
    slug: getPlainText(props.Slug?.rich_text),
    thumbnail: props.Thumbnail?.url || null,
    category: props.Category?.select?.name || null,
    createdAt: props['Created Time']?.date?.start || null,
    published: props.Published?.checkbox ?? false,
    notionUrl: page.url
  };
}

function normalizeFilterValue(value?: string): string {
  return value?.trim().toLowerCase() || '';
}

function matchesArticle(
  article: ArticleListItem,
  normalizedQuery: string,
  normalizedCategory: string
): boolean {
  if (
    normalizedCategory &&
    normalizeFilterValue(article.category || '') !== normalizedCategory
  ) {
    return false;
  }

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    article.title,
    article.description,
    article.slug,
    article.category || ''
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

async function fetchPublishedArticles(env: Env): Promise<ArticleListItem[]> {
  const articleDataSourceId = await getEnvValue(env, 'ARTICLE_DATA_SOURCE_ID');

  if (!articleDataSourceId) {
    throw new Error('Missing ARTICLE_DATA_SOURCE_ID secret.');
  }

  const allResults: NotionPage[] = [];
  let nextCursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await notionFetch(
      `/v1/data_sources/${articleDataSourceId}/query`,
      env,
      {
        method: 'POST',
        body: JSON.stringify({
          page_size: 100,
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
      throw new Error(
        `Failed to fetch from Notion (${response.status}): ${errorData}`
      );
    }

    const data = (await response.json()) as FeedQueryResult;
    allResults.push(...data.results);
    hasMore = Boolean(data.has_more && data.next_cursor);
    nextCursor = data.next_cursor || undefined;
  }

  return allResults.map(simplifyArticle);
}

export async function queryArticles(
  env: Env,
  options: ArticleQueryOptions = {}
): Promise<ArticleCollectionResponse> {
  const safePageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize || 8)));
  const requestedPageNumber = Math.max(1, Math.floor(options.pageNumber || 1));
  const normalizedQuery = normalizeFilterValue(options.query);
  const normalizedCategory = normalizeFilterValue(options.category);

  const allArticles = await fetchPublishedArticles(env);
  const filteredArticles = allArticles.filter((article) =>
    matchesArticle(article, normalizedQuery, normalizedCategory)
  );

  const availableCategories = Array.from(
    new Set(allArticles.map((article) => article.category).filter(Boolean))
  ).sort((left, right) => left!.localeCompare(right!)) as string[];

  const totalItems = filteredArticles.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safePageSize);
  const pageNumber = totalPages === 0 ? 1 : Math.min(requestedPageNumber, totalPages);
  const startIndex = (pageNumber - 1) * safePageSize;
  const items = filteredArticles.slice(startIndex, startIndex + safePageSize);

  return {
    pageNumber,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    hasMore: totalPages > 0 && pageNumber < totalPages,
    hasPrevious: pageNumber > 1,
    availableCategories,
    items
  };
}

export async function handleFeed(
  env: Env,
  pageNumber = 1,
  pageSize = 8,
  category?: string,
  query?: string
): Promise<Response> {
  try {
    const feed = await queryArticles(env, { pageNumber, pageSize, category, query });
    return jsonResponse(feed);
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
