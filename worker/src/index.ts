import { handleFeed } from './handlers/feed';
import { handleProduct } from './handlers/product';
import { handleSearch } from './handlers/search';
import { fetchArticleDetailData, handleArticleDetail } from './handlers/article';
import {
  htmlResponse,
  renderArticlePage,
  renderErrorPage
} from './handlers/articlePage';
import { errorResponse } from './utils/response';
import { getEnvValue } from './utils/env';
import { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    return handleRequest(request, path, env);
  }
};

async function handleRequest(
  request: Request,
  path: string,
  env: Env
): Promise<Response> {
  if (!isWorkerRoute(path)) {
    return errorResponse('Route not found', null, 404);
  }

  const notionToken = await getEnvValue(env, 'NOTION_TOKEN');
  if (!notionToken) {
    return errorResponse('Missing NOTION_TOKEN secret.');
  }

  const url = new URL(request.url);
  const siteName = 'Woodzpacker';
  const siteTagline = '沉香';
  const siteDescription ='专注于马来西亚野生沉香与佛教珍品的交流';

  // Static routes
  if (path === '/v1/feed') {
    const pageNumber = Number(url.searchParams.get('pageNumber') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '8');
    const category = url.searchParams.get('category') || undefined;
    const query = url.searchParams.get('q') || undefined;
    return handleFeed(env, pageNumber, pageSize, category, query);
  }

  if (path === '/v1/search') {
    const query = url.searchParams.get('q') || url.searchParams.get('query') || '';
    const category = url.searchParams.get('category') || '';
    const pageNumber = Number(url.searchParams.get('pageNumber') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '8');
    return handleSearch(env, query, category, pageNumber, pageSize);
  }
  
  if (path === '/v1/product') {
    return handleProduct(env);
  }

  // Dynamic routes (e.g., /v1/article/:id)
  if (path.startsWith('/v1/article/')) {
    const articleId = path.split('/').pop();
    if (articleId) return handleArticleDetail(articleId, env);
  }

  if (path.startsWith('/article/')) {
    const articleId = path.split('/').pop();
    if (!articleId) {
      return htmlResponse(renderErrorPage('Missing article id.', siteName), 400);
    }

    try {
      const article = await fetchArticleDetailData(articleId, env);
      if (article.slug && articleId !== article.slug) {
        return Response.redirect(
          new URL(`/article/${article.slug}`, request.url).toString(),
          301
        );
      }

      return htmlResponse(
        renderArticlePage(
          article.id,
          article.slug,
          article.title,
          article.blocks,
          new URL(request.url),
          siteName,
          siteTagline,
          siteDescription
        )
      );
    } catch (error: any) {
      return htmlResponse(
        renderErrorPage(error.message || 'Failed to load article.', siteName),
        502
      );
    }
  }

  return errorResponse('Route not found', null, 404);
}

function isWorkerRoute(path: string): boolean {
  return path.startsWith('/v1/') || path.startsWith('/article/');
}
