import { Env } from '../types';
import { errorResponse, jsonResponse } from '../utils/response';
import { queryArticles } from './feed';

export async function handleSearch(
  env: Env,
  publicBaseUrl: string,
  query = '',
  category = '',
  pageNumber = 1,
  pageSize = 8
): Promise<Response> {
  try {
    const results = await queryArticles(env, {
      query,
      category,
      pageNumber,
      pageSize
    }, publicBaseUrl);

    return jsonResponse({
      ...results,
      query: query.trim(),
      category: category.trim() || null
    });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
