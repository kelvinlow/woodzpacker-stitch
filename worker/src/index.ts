import { handleFeed } from './handlers/feed';
import { handleProduct } from './handlers/product';
import { handleArticleDetail } from './handlers/article';
import { errorResponse } from './utils/response';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const NOTION_TOKEN = await env.NOTION_TOKEN.get();
    const ARTICLE_DATA_SOURCE_ID = await env.ARTICLE_DATA_SOURCE_ID.get();
    const PRODUCT_DATA_SOURCE_ID = await env.PRODUCT_DATA_SOURCE_ID.get();
    const path = url.pathname;

    // Debug route to check presence of secret bindings without leaking values
    if (path === '/_debug/env') {
      return new Response(
        JSON.stringify({
          NOTION_TOKEN_set: NOTION_TOKEN,
          ARTICLE_DATA_SOURCE_ID_set: ARTICLE_DATA_SOURCE_ID,
          PRODUCT_DATA_SOURCE_ID_set: PRODUCT_DATA_SOURCE_ID
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!NOTION_TOKEN) {
      return errorResponse('Missing NOTION_TOKEN secret.');
    }

    return handleRequest(path, env);
  }
};

async function handleRequest(path: string, env: any): Promise<Response> {
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
