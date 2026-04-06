export interface Env {
  NOTION_TOKEN: string;
  DATA_SOURCE_ID: string;
  NOTION_API_VERSION: string;
}

interface NotionProperty {
  type: string;
  [key: string]: any;
}

interface NotionPage {
  id: string;
  properties: Record<string, NotionProperty>;
  url: string;
}

interface NotionResponse {
  results: NotionPage[];
}

interface NotionBlock {
  type: string;
  id: string;
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { NOTION_TOKEN, DATABASE_ID, NOTION_API_VERSION } = env;
    const url = new URL(request.url);
    const path = url.pathname;

    if (!NOTION_TOKEN || !DATABASE_ID) {
      return new Response(
        JSON.stringify({
          error: 'Missing NOTION_TOKEN or DATABASE_ID secrets.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return handleRequest(path, env);
  }
};

async function handleRequest(path: string, env: Env): Promise<Response> {
  // Route: Article List
  if (path === '/v1/feed') {
    return handleFeed(env);
  }

  // Route: Article Detail
  if (path.startsWith('/v1/article/')) {
    const articleId = path.split('/').pop();
    if (articleId) {
      return handleArticleDetail(articleId, env);
    }
  }

  return new Response(JSON.stringify({ error: 'Route not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleFeed(env: Env): Promise<Response> {
  const { NOTION_TOKEN, DATA_SOURCE_ID, NOTION_API_VERSION } = env;

  try {
    const response = await fetch(
      `https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch from Notion',
          details: errorData
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = (await response.json()) as NotionResponse;

    const simplifiedResults = data.results.map((page) => {
      const props = page.properties;

      return {
        id: page.id,
        title: props.Title?.title?.[0]?.plain_text || 'Untitled',
        description: props.Description?.rich_text?.[0]?.plain_text || '',
        slug: props.Slug?.rich_text?.[0]?.plain_text || '',
        thumbnail: props.Thumbnail?.url || null,
        category: props.Category?.select?.name || null,
        createdAt: props['Created Time']?.date?.start || null,
        published: props.Published?.checkbox ?? false,
        notionUrl: page.url
      };
    });

    return new Response(JSON.stringify(simplifiedResults, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleArticleDetail(
  articleId: string,
  env: Env
): Promise<Response> {
  const { NOTION_TOKEN, NOTION_API_VERSION } = env;

  try {
    const response = await fetch(
      `https://api.notion.com/v1/blocks/${articleId}/children`,
      {
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_API_VERSION
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch article content',
          details: errorData
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = (await response.json()) as { results: NotionBlock[] };

    const simplifiedBlocks = data.results.map((block) => {
      const type = block.type;
      const content = block[type];

      let simplified: any = { type, id: block.id };

      if (
        [
          'paragraph',
          'heading_1',
          'heading_2',
          'heading_3',
          'bulleted_list_item',
          'numbered_list_item'
        ].includes(type)
      ) {
        simplified.text =
          content.rich_text?.map((t: any) => t.plain_text).join('') || '';
      } else if (type === 'image') {
        simplified.url = content.external?.url || content.file?.url || '';
        simplified.caption =
          content.caption?.map((t: any) => t.plain_text).join('') || '';
      }

      return simplified;
    });

    return new Response(JSON.stringify({ blocks: simplifiedBlocks }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
