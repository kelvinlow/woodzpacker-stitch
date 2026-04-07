export async function notionFetch(
  path: string,
  env: any,
  options: RequestInit = {}
): Promise<Response> {
  const NOTION_TOKEN = await env.NOTION_TOKEN.get();
  const NOTION_API_VERSION = await env.NOTION_API_VERSION.get();

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
