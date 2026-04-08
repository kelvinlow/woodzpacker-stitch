import { handleFeed } from './handlers/feed';
import { handleProduct } from './handlers/product';
import { fetchArticleDetailData, handleArticleDetail } from './handlers/article';
import {
  htmlResponse,
  renderArticlePage,
  renderErrorPage,
  renderHomePage
} from './handlers/articlePage';
import { errorResponse } from './utils/response';
import { getEnvValue } from './utils/env';
import { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const notionToken = await getEnvValue(env, 'NOTION_TOKEN');
    if (!notionToken) {
      return errorResponse('Missing NOTION_TOKEN secret.');
    }

    return handleRequest(request, path, env);
  }
};

async function handleRequest(
  request: Request,
  path: string,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const siteName = (await getEnvValue(env, 'SITE_NAME')) || 'Woodzpacker';
  const siteTagline = (await getEnvValue(env, 'SITE_TAGLINE')) || '沉香';
  const siteDescription =
    (await getEnvValue(env, 'SITE_DESCRIPTION')) ||
    '专注于马来西亚野生沉香与佛教珍品';

  if (path === '/') {
    return htmlResponse(renderHomePage(siteName, new URL(request.url).origin));
  }

  // Static routes
  if (path === '/v1/feed') {
    const pageNumber = Number(url.searchParams.get('pageNumber') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '8');
    return handleFeed(env, pageNumber, pageSize);
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
