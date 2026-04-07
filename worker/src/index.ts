import { Env } from './types';
import { handleFeed } from './handlers/feed';
import { handleProduct } from './handlers/product';
import { handleArticleDetail } from './handlers/article';
import { errorResponse } from './utils/response';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { NOTION_TOKEN } = env;
    const url = new URL(request.url);
    const path = url.pathname;

    if (!NOTION_TOKEN) {
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
