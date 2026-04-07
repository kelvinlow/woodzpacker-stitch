import { handleFeed } from './handlers/feed';
import { handleProduct } from './handlers/product';
import { handleArticleDetail } from './handlers/article';
import { errorResponse } from './utils/response';
import { getEnvValue } from './utils/env';
import { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Debug route to check presence of secret bindings without leaking values
    if (path === '/_debug/env') {
      const notionToken = await getEnvValue(env, 'NOTION_TOKEN');
      const articleDataSourceId = await getEnvValue(env, 'ARTICLE_DATA_SOURCE_ID');
      const productDataSourceId = await getEnvValue(env, 'PRODUCT_DATA_SOURCE_ID');

      return new Response(
        JSON.stringify({
          NOTION_TOKEN_set: Boolean(notionToken),
          ARTICLE_DATA_SOURCE_ID_set: Boolean(articleDataSourceId),
          PRODUCT_DATA_SOURCE_ID_set: Boolean(productDataSourceId)
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const notionToken = await getEnvValue(env, 'NOTION_TOKEN');
    if (!notionToken) {
      return errorResponse('Missing NOTION_TOKEN secret.');
    }

    return handleRequest(path, env);
  }
};

async function handleRequest(path: string, env: Env): Promise<Response> {
  // Static routes
  if (path === '/v1/feed') {
    return handleFeed(env);
  }
  
  if (path === '/v1/product') {
    return handleProduct(env);
  }

  // Dynamic routes (e.g., /v1/article/:id)
  if (path.startsWith('/v1/article/')) {
    const articleId = path.split('/').pop();
    if (articleId) return handleArticleDetail(articleId, env);
  }

  return errorResponse('Route not found', null, 404);
}
