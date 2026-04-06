export interface Env {
  NOTION_TOKEN: string;
  DATABASE_ID: string;
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { NOTION_TOKEN, DATABASE_ID, NOTION_API_VERSION } = env;

    if (!NOTION_TOKEN || !DATABASE_ID) {
      return new Response(
        JSON.stringify({ error: "Missing NOTION_TOKEN or DATABASE_ID secrets." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const response = await fetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": NOTION_API_VERSION,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filter: {
              property: "Published",
              checkbox: {
                equals: true,
              },
            },
            sorts: [
              {
                property: "Created Time",
                direction: "descending",
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return new Response(
          JSON.stringify({ error: "Failed to fetch from Notion", details: errorData }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = (await response.json()) as NotionResponse;

      const simplifiedResults = data.results.map((page) => {
        const props = page.properties;

        return {
          id: page.id,
          title: props.Title?.title?.[0]?.plain_text || "Untitled",
          description: props.Description?.rich_text?.[0]?.plain_text || "",
          slug: props.Slug?.rich_text?.[0]?.plain_text || "",
          thumbnail: props.Thumbnail?.url || null,
          category: props.Category?.select?.name || null,
          createdAt: props["Created Time"]?.date?.start || null,
          published: props.Published?.checkbox ?? false,
          notionUrl: page.url,
        };
      });

      return new Response(JSON.stringify(simplifiedResults, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
