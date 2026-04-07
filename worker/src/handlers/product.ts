import { Env, NotionResponse } from '../types';
import { errorResponse, JSON_HEADERS } from '../utils/response';
import { notionFetch } from '../utils/notion';

export async function handleProduct(env: Env): Promise<Response> {
  const { PRODUCT_DATA_SOURCE_ID } = env;

  if (!PRODUCT_DATA_SOURCE_ID) {
    return errorResponse('Missing PRODUCT_DATA_SOURCE_ID secret.');
  }

  try {
    const response = await notionFetch(
      `/v1/data_sources/${PRODUCT_DATA_SOURCE_ID}/query`,
      env,
      {
        method: 'POST',
        body: JSON.stringify({
          sorts: [
            {
              property: 'Created Time',
              direction: 'descending'
            }
          ],
          page_size: 100,
          in_trash: true,
          result_type: 'page'
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return errorResponse('Failed to fetch from Notion', errorData, response.status);
    }

    const data = (await response.json()) as NotionResponse;

    const simplifiedResults = data.results.map((page) => {
      const props = page.properties;

      return {
        id: page.id,
        productName: props['Product Name']?.title?.[0]?.plain_text || 'Untitled',
        supplier: props.Supplier?.rich_text?.[0]?.plain_text || '',
        status: props.Status?.status?.name || null,
        stock: props.Stock?.number || 0,
        createdTime: props['Created Time']?.date?.start || null,
        manufactoryDate: props['Manufactory Date']?.date?.start || null,
        productCategory: props['Product Category']?.select?.name || null,
        discountPrice: props['Discount Price']?.number || 0,
        sellingPrice: props['Selling Price']?.number || 0,
        notionUrl: page.url
      };
    });

    return new Response(JSON.stringify(simplifiedResults, null, 2), {
      headers: JSON_HEADERS
    });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
