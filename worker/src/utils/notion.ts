import { Env } from '../types';

export async function notionFetch(
  path: string,
  env: Env,
  options: RequestInit = {}
): Promise<Response> {
  const { NOTION_TOKEN, NOTION_API_VERSION } = env;

  const url = `https://api.notion.com${path}`;
  const headers = {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': NOTION_API_VERSION,
    'Content-Type': 'application/json',
    ...options.headers
  };

  return fetch(url, {
    ...options,
    headers
  });
}
