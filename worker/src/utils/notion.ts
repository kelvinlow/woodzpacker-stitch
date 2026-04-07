import { Env } from '../types';
import { getEnvValue } from './env';

export async function notionFetch(
  path: string,
  env: Env,
  options: RequestInit = {}
): Promise<Response> {
  const notionToken = await getEnvValue(env, 'NOTION_TOKEN');
  const notionApiVersion = await getEnvValue(env, 'NOTION_API_VERSION');

  if (!notionToken) {
    throw new Error('Missing NOTION_TOKEN secret.');
  }

  if (!notionApiVersion) {
    throw new Error('Missing NOTION_API_VERSION variable.');
  }

  const url = `https://api.notion.com${path}`;
  const headers = {
    Authorization: `Bearer ${notionToken}`,
    'Notion-Version': notionApiVersion,
    'Content-Type': 'application/json',
    ...options.headers
  };

  return fetch(url, {
    ...options,
    headers
  });
}
