import { Env, NotionResponse } from '../types';
import { errorResponse, jsonResponse } from '../utils/response';
import { getEnvValue } from '../utils/env';
import { notionFetch } from '../utils/notion';

export async function queryProducts(env: Env): Promise<any[]> {
  const productDataSourceId = await getEnvValue(env, 'PRODUCT_DATA_SOURCE_ID');

  if (!productDataSourceId) {
    throw new Error('Missing PRODUCT_DATA_SOURCE_ID secret.');
  }

  const response = await notionFetch(
    `/v1/data_sources/${productDataSourceId}/query`,
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
    throw new Error(`Failed to fetch from Notion: ${errorData}`);
  }

  const data = (await response.json()) as NotionResponse;

  return data.results.map((page) => {
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
    };
  });
}

export async function handleProduct(env: Env): Promise<Response> {
  try {
    const products = await queryProducts(env);
    return jsonResponse(products);
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
