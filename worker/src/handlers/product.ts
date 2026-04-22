import { Env, NotionBlock, NotionPage, NotionResponse } from '../types';
import { errorResponse, jsonResponse } from '../utils/response';
import { getEnvValue } from '../utils/env';
import { notionFetch } from '../utils/notion';

type ProductQueryResult = NotionResponse & {
  has_more?: boolean;
  next_cursor?: string | null;
};

export type ProductListItem = {
  id: string;
  slug: string;
  productName: string;
  supplier: string;
  status: string | null;
  stock: number;
  createdTime: string | null;
  manufactoryDate: string | null;
  productCategory: string | null;
  discountPrice: number | null;
  sellingPrice: number | null;
  thumbnail: string | null;
  description: string;
  origin: string | null;
  grade: string | null;
  density: string | null;
  aged: string | null;
  size: string | null;
  material: string | null;
  scentProfile: string[];
  gallery: string[];
  story: string;
  materialOrigin: string;
  careGuide: string;
  shippingNotes: string;
};

export type SimplifiedProductBlock = {
  type: string;
  id: string;
  text?: string;
  url?: string;
  caption?: string;
  cells?: string[][];
  has_children?: boolean;
  children?: SimplifiedProductBlock[];
};

export type ProductDetailData = ProductListItem & {
  blocks: SimplifiedProductBlock[];
};

type ProductCollectionResponse = {
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
  availableCategories: string[];
  items: ProductListItem[];
};

type ProductQueryOptions = {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  category?: string;
  sort?: string;
};

function getPlainText(richText?: any[]): string {
  return richText?.map((item: any) => item.plain_text || '').join('') || '';
}

function getTitleValue(property?: any): string {
  return getPlainText(property?.title);
}

function getRichTextValue(property?: any): string {
  return getPlainText(property?.rich_text);
}

function getSelectValue(property?: any): string | null {
  return property?.select?.name || null;
}

function getStatusValue(property?: any): string | null {
  return property?.status?.name || null;
}

function getDateValue(property?: any): string | null {
  return property?.date?.start || null;
}

function getNumberValue(property?: any): number | null {
  return typeof property?.number === 'number' ? property.number : null;
}

function getFilesValue(property?: any): string[] {
  const files = Array.isArray(property?.files) ? property.files : [];
  return files
    .map((file: any) => file?.external?.url || file?.file?.url || '')
    .filter(Boolean);
}

function normalizeFilterValue(value?: string): string {
  return value?.trim().toLowerCase() || '';
}

function slugifyProductName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeNotionId(value: string): string {
  return value.replace(/-/g, '').toLowerCase();
}

function looksLikeNotionId(value: string): boolean {
  return /^[a-f0-9]{32}$/i.test(normalizeNotionId(value));
}

function formatCurrencyFragment(value: number | null): string {
  if (typeof value !== 'number') {
    return '';
  }

  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

function getCheckboxValue(property?: any): boolean {
  return Boolean(property?.checkbox);
}

function getFallbackDescription(productName: string, category?: string | null): string {
  const categoryLabel = category || 'collection';
  return `${productName} from the Woodzpacker ${categoryLabel.toLowerCase()} archive.`;
}

function getFallbackStory(product: ProductListItem): string {
  return `${product.productName} is curated for collectors who value material character, provenance, and quiet ritual. Each piece is selected to preserve the natural texture and scent progression of the original material.`;
}

function getFallbackMaterialOrigin(product: ProductListItem): string {
  const origin = product.origin || product.supplier || 'our sourcing network';
  return `This piece is sourced through ${origin} and inspected for material consistency, finish quality, and long-term stability before it enters the collection.`;
}

function getFallbackCareGuide(product: ProductListItem): string {
  const material = product.material || 'the product';
  return `Store ${material.toLowerCase()} away from direct sunlight, excessive humidity, and sharp temperature shifts. Handle with clean hands and keep it in a dry, ventilated container when not in use.`;
}

function getFallbackShippingNotes(product: ProductListItem): string {
  const stockLabel = product.stock > 0 ? 'ready for fulfilment' : 'currently limited';
  return `This item is ${stockLabel}. Packaging is reinforced for international transit and prepared for presentation-grade delivery.`;
}

function simplifyProduct(page: NotionPage): ProductListItem {
  const props = page.properties;
  const productName = getTitleValue(props['Product Name']) || 'Untitled';
  const explicitSlug = getRichTextValue(props.Slug);
  const generatedSlug = slugifyProductName(productName) || normalizeNotionId(page.id);
  const slug = explicitSlug || `${generatedSlug}-${normalizeNotionId(page.id).slice(0, 8)}`;
  const fileGallery = [
    ...getFilesValue(props.Thumbnail),
    ...getFilesValue(props.Images),
    ...getFilesValue(props.Gallery)
  ];
  const coverImage = page.cover?.external?.url || page.cover?.file?.url || null;
  const thumbnail = fileGallery[0] || props.Thumbnail?.url || coverImage || null;
  const gallery = Array.from(
    new Set([thumbnail, ...fileGallery, coverImage].filter(Boolean))
  ) as string[];
  const sellingPrice = getNumberValue(props['Selling Price']);
  const discountPrice = getNumberValue(props['Discount Price']);
  const material = getSelectValue(props.Material) || getRichTextValue(props.Material) || null;
  const size = getRichTextValue(props.Size) || null;
  const origin = getSelectValue(props.Origin) || getRichTextValue(props.Origin) || null;
  const grade = getSelectValue(props.Grade) || getRichTextValue(props.Grade) || null;
  const density = getSelectValue(props.Density) || getRichTextValue(props.Density) || null;
  const aged = getRichTextValue(props.Aged) || getRichTextValue(props['Aged Statement']) || null;
  const scentProfileText = getRichTextValue(props['Scent Profile']) || getRichTextValue(props.Scent);
  const scentProfile = scentProfileText
    ? scentProfileText
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const visibilityEnabled =
    getCheckboxValue(props.Published) ||
    getCheckboxValue(props.Visible) ||
    getCheckboxValue(props.Active) ||
    getStatusValue(props.Status) === 'Active';

  const product: ProductListItem = {
    id: page.id,
    slug,
    productName,
    supplier: getRichTextValue(props.Supplier),
    status: getStatusValue(props.Status),
    stock: getNumberValue(props.Stock) || 0,
    createdTime: getDateValue(props['Created Time']),
    manufactoryDate: getDateValue(props['Manufactory Date']),
    productCategory: getSelectValue(props['Product Category']),
    discountPrice,
    sellingPrice,
    thumbnail,
    description:
      getRichTextValue(props.Description) ||
      getRichTextValue(props.Summary) ||
      getFallbackDescription(productName, getSelectValue(props['Product Category'])),
    origin,
    grade,
    density,
    aged,
    size,
    material,
    scentProfile,
    gallery,
    story: getRichTextValue(props.Story),
    materialOrigin: getRichTextValue(props['Material Origin']),
    careGuide: getRichTextValue(props['Care Guide']),
    shippingNotes: getRichTextValue(props['Shipping Notes'])
  };

  product.story = product.story || getFallbackStory(product);
  product.materialOrigin = product.materialOrigin || getFallbackMaterialOrigin(product);
  product.careGuide = product.careGuide || getFallbackCareGuide(product);
  product.shippingNotes = product.shippingNotes || getFallbackShippingNotes(product);

  return {
    ...product,
    status: visibilityEnabled ? product.status : (product.status || 'Draft')
  };
}

async function fetchPublishedProducts(env: Env): Promise<ProductListItem[]> {
  const productDataSourceId = await getEnvValue(env, 'PRODUCT_DATA_SOURCE_ID');

  if (!productDataSourceId) {
    throw new Error('Missing PRODUCT_DATA_SOURCE_ID secret.');
  }

  const allResults: NotionPage[] = [];
  let nextCursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
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
          ...(nextCursor ? { start_cursor: nextCursor } : {}),
          result_type: 'page'
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to fetch from Notion (${response.status}): ${errorData}`);
    }

    const data = (await response.json()) as ProductQueryResult;
    allResults.push(
      ...data.results.filter((page) => !page.in_trash && !page.is_archived)
    );
    hasMore = Boolean(data.has_more && data.next_cursor);
    nextCursor = data.next_cursor || undefined;
  }

  return allResults.map(simplifyProduct);
}

async function fetchBlockChildren(
  blockId: string,
  env: Env
): Promise<NotionBlock[]> {
  const response = await notionFetch(`/v1/blocks/${blockId}/children`, env);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch child blocks for ${blockId} (${response.status}): ${errorData}`
    );
  }

  const data = (await response.json()) as { results: NotionBlock[] };
  return data.results;
}

async function hydrateBlocks(
  blocks: NotionBlock[],
  env: Env
): Promise<NotionBlock[]> {
  return Promise.all(
    blocks.map(async (block) => {
      if (!block.has_children) {
        return block;
      }

      const children = await fetchBlockChildren(block.id, env);
      return {
        ...block,
        children: await hydrateBlocks(children, env)
      };
    })
  );
}

function simplifyProductBlocks(blocks: any[]): SimplifiedProductBlock[] {
  return blocks.map((block) => {
    const type = block.type;
    const content = block[type];

    const simplified: SimplifiedProductBlock = {
      type,
      id: block.id,
      has_children: Boolean(block.has_children)
    };

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
      simplified.text = getPlainText(content.rich_text);
    } else if (type === 'image') {
      simplified.url = content.external?.url || content.file?.url || '';
      simplified.caption = getPlainText(content.caption);
    } else if (type === 'table_row') {
      simplified.cells =
        content.cells?.map((cell: any[]) =>
          cell.map((item: any) => item.plain_text || '')
        ) || [];
    }

    if (Array.isArray(block.children) && block.children.length > 0) {
      simplified.children = simplifyProductBlocks(block.children);
    }

    return simplified;
  });
}

async function fetchProductBlocks(
  productId: string,
  env: Env
): Promise<SimplifiedProductBlock[]> {
  const response = await notionFetch(`/v1/blocks/${productId}/children`, env);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch product content (${response.status}): ${errorData}`
    );
  }

  const data = (await response.json()) as { results: NotionBlock[] };
  const hydratedBlocks = await hydrateBlocks(data.results, env);
  return simplifyProductBlocks(hydratedBlocks);
}

function matchesProduct(
  product: ProductListItem,
  normalizedQuery: string,
  normalizedCategory: string
): boolean {
  if (
    normalizedCategory &&
    normalizeFilterValue(product.productCategory || '') !== normalizedCategory
  ) {
    return false;
  }

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    product.productName,
    product.supplier,
    product.productCategory || '',
    product.description,
    product.origin || '',
    product.grade || '',
    product.material || '',
    product.slug,
    product.scentProfile.join(' ')
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function sortProducts(products: ProductListItem[], sort: string): ProductListItem[] {
  const normalizedSort = normalizeFilterValue(sort) || 'latest';
  const items = [...products];

  items.sort((left, right) => {
    if (normalizedSort === 'price-asc') {
      return (left.discountPrice ?? left.sellingPrice ?? Number.MAX_SAFE_INTEGER) -
        (right.discountPrice ?? right.sellingPrice ?? Number.MAX_SAFE_INTEGER);
    }

    if (normalizedSort === 'price-desc') {
      return (right.discountPrice ?? right.sellingPrice ?? -1) -
        (left.discountPrice ?? left.sellingPrice ?? -1);
    }

    if (normalizedSort === 'name') {
      return left.productName.localeCompare(right.productName);
    }

    return (Date.parse(right.createdTime || '') || 0) - (Date.parse(left.createdTime || '') || 0);
  });

  return items;
}

export async function queryProducts(
  env: Env,
  options: ProductQueryOptions = {}
): Promise<ProductCollectionResponse> {
  const safePageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize || 9)));
  const requestedPageNumber = Math.max(1, Math.floor(options.pageNumber || 1));
  const normalizedQuery = normalizeFilterValue(options.query);
  const normalizedCategory = normalizeFilterValue(options.category);

  const allProducts = await fetchPublishedProducts(env);
  const filteredProducts = sortProducts(
    allProducts.filter((product) =>
      matchesProduct(product, normalizedQuery, normalizedCategory)
    ),
    options.sort || 'latest'
  );

  const availableCategories = Array.from(
    new Set(allProducts.map((product) => product.productCategory).filter(Boolean))
  ).sort((left, right) => left!.localeCompare(right!)) as string[];

  const totalItems = filteredProducts.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safePageSize);
  const pageNumber = totalPages === 0 ? 1 : Math.min(requestedPageNumber, totalPages);
  const startIndex = (pageNumber - 1) * safePageSize;
  const items = filteredProducts.slice(startIndex, startIndex + safePageSize);

  return {
    pageNumber,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    hasMore: totalPages > 0 && pageNumber < totalPages,
    hasPrevious: pageNumber > 1,
    availableCategories,
    items
  };
}

export async function fetchProductDetailData(
  identifier: string,
  env: Env
): Promise<ProductDetailData> {
  const products = await fetchPublishedProducts(env);
  const normalizedIdentifier = identifier.trim().toLowerCase();

  const product = products.find((item) => {
    if (item.slug.toLowerCase() === normalizedIdentifier) {
      return true;
    }

    if (normalizeNotionId(item.id) === normalizeNotionId(normalizedIdentifier)) {
      return true;
    }

    return false;
  });

  if (!product) {
    throw new Error(`Product "${identifier}" was not found.`);
  }

  const blocks = await fetchProductBlocks(product.id, env);

  return {
    ...product,
    story: product.story || getFallbackStory(product),
    materialOrigin: product.materialOrigin || getFallbackMaterialOrigin(product),
    careGuide: product.careGuide || getFallbackCareGuide(product),
    shippingNotes: product.shippingNotes || getFallbackShippingNotes(product),
    description:
      product.description ||
      getFallbackDescription(product.productName, product.productCategory),
    blocks
  };
}

export async function handleProductCollection(
  env: Env,
  pageNumber = 1,
  pageSize = 9,
  category?: string,
  query?: string,
  sort?: string
): Promise<Response> {
  try {
    const products = await queryProducts(env, {
      pageNumber,
      pageSize,
      category,
      query,
      sort
    });

    return jsonResponse(products);
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

export async function handleProductDetail(
  identifier: string,
  env: Env
): Promise<Response> {
  try {
    const product = await fetchProductDetailData(identifier, env);
    return jsonResponse(product);
  } catch (error: any) {
    return errorResponse(error.message, null, 404);
  }
}

export function getProductPriceLabel(product: ProductListItem): string {
  const discount = formatCurrencyFragment(product.discountPrice);
  const selling = formatCurrencyFragment(product.sellingPrice);

  if (discount && selling && discount !== selling) {
    return discount;
  }

  return selling || discount || 'Price on request';
}
