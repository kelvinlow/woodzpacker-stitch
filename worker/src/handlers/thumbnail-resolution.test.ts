import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types';

vi.mock('../utils/env', () => ({
  getEnvValue: vi.fn()
}));

vi.mock('../utils/notion', () => ({
  notionFetch: vi.fn()
}));

const { getEnvValue } = await import('../utils/env');
const { notionFetch } = await import('../utils/notion');
const { queryArticles } = await import('./feed');
const { fetchArticleDetailData } = await import('./article');
const { queryProducts, fetchProductDetailData } = await import('./product');

const mockEnv: Env = {
  NOTION_TOKEN: 'token',
  ARTICLE_DATA_SOURCE_ID: 'articles',
  PRODUCT_DATA_SOURCE_ID: 'products',
  NOTION_API_VERSION: '2026-03-11'
};

const mockBucket = {
  get: vi.fn(),
  head: vi.fn(),
  put: vi.fn()
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' }
  });
}

function makeArticlePage() {
  return {
    id: 'article-1',
    properties: {
      Title: { title: [{ plain_text: 'Agarwood Notes' }] },
      Description: { rich_text: [{ plain_text: 'A short description' }] },
      Slug: { rich_text: [{ plain_text: 'agarwood-notes' }] },
      Thumbnail: { url: 'https://example.com/article-property.jpg' },
      Category: { select: { name: 'Knowledge' } },
      Published: { checkbox: true },
      'Created Time': { date: { start: '2026-05-18' } }
    }
  };
}

function makeProductPage() {
  return {
    id: 'product-1',
    properties: {
      'Product Name': { title: [{ plain_text: 'Prayer Beads' }] },
      Slug: { rich_text: [{ plain_text: 'prayer-beads' }] },
      Supplier: { rich_text: [{ plain_text: 'Woodzpacker' }] },
      Status: { status: { name: 'Active' } },
      Stock: { number: 5 },
      'Created Time': { date: { start: '2026-05-18' } },
      'Product Category': { select: { name: 'Beads' } },
      Thumbnail: {
        files: [{ external: { url: 'https://example.com/product-property.jpg' } }]
      },
      Description: { rich_text: [{ plain_text: 'Hand-selected beads' }] }
    }
  };
}

function blockChildrenWithImage(imageUrl: string) {
  return {
    results: [
      {
        id: 'block-1',
        type: 'paragraph',
        has_children: false,
        paragraph: {
          rich_text: [{ plain_text: 'Intro paragraph' }]
        }
      },
      {
        id: 'block-2',
        type: 'image',
        has_children: false,
        image: {
          external: { url: imageUrl },
          caption: [{ plain_text: 'Hero image' }]
        }
      }
    ]
  };
}

describe('thumbnail resolution from notion blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBucket.get.mockReset();
    mockBucket.head.mockReset();
    mockBucket.put.mockReset();
    vi.mocked(getEnvValue).mockImplementation(async (_env, key) => {
      if (key === 'ARTICLE_DATA_SOURCE_ID') {
        return 'articles';
      }

      if (key === 'PRODUCT_DATA_SOURCE_ID') {
        return 'products';
      }

      return undefined;
    });
  });

  it('stores notion-hosted article thumbnails in R2 and returns a stable media URL', async () => {
    vi.mocked(notionFetch).mockImplementation(async (path: string) => {
      if (path === '/v1/data_sources/articles/query') {
        return jsonResponse({
          results: [makeArticlePage()],
          has_more: false,
          next_cursor: null
        });
      }

      if (path === '/v1/blocks/article-1/children') {
        return jsonResponse(
          blockChildrenWithImage(
            'https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace/file/image.png?X-Amz-Expires=3600'
          )
        );
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    mockBucket.head.mockResolvedValue(null);
    mockBucket.put.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('image-bytes', {
          headers: { 'Content-Type': 'image/png' }
        })
      )
    );

    const response = await queryArticles(
      {
        ...mockEnv,
        MEDIA_BUCKET: mockBucket
      },
      { pageSize: 1 },
      'https://woodzpacker.test'
    );

    expect(response.items[0].thumbnail).toMatch(
      /^https:\/\/woodzpacker\.test\/media\/article\/article-1\/block-2-[a-f0-9]{8}\.png$/
    );
    expect(mockBucket.put).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('uses the first article image block for /v1/article thumbnails', async () => {
    vi.mocked(notionFetch).mockImplementation(async (path: string) => {
      if (path === '/v1/data_sources/articles/query') {
        return jsonResponse({
          results: [makeArticlePage()],
          has_more: false,
          next_cursor: null
        });
      }

      if (path === '/v1/blocks/article-1/children') {
        return jsonResponse(
          blockChildrenWithImage('https://example.com/article-block.jpg')
        );
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    const response = await queryArticles(mockEnv, { pageSize: 1 }, 'https://woodzpacker.test');

    expect(response.items).toHaveLength(1);
    expect(response.items[0].thumbnail).toBe('https://example.com/article-block.jpg');
  });

  it('uses the first article image block for /v1/article/:id detail thumbnails', async () => {
    vi.mocked(notionFetch).mockImplementation(async (path: string) => {
      if (path === '/v1/data_sources/articles/query') {
        return jsonResponse({
          results: [makeArticlePage()],
          has_more: false,
          next_cursor: null
        });
      }

      if (path === '/v1/blocks/article-1/children') {
        return jsonResponse(
          blockChildrenWithImage('https://example.com/article-detail-block.jpg')
        );
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    const article = await fetchArticleDetailData('agarwood-notes', mockEnv, 'https://woodzpacker.test');

    expect(article.thumbnail).toBe('https://example.com/article-detail-block.jpg');
    expect(article.blocks[1].url).toBe('https://example.com/article-detail-block.jpg');
  });

  it('uses the first product image block for /v1/product thumbnails', async () => {
    vi.mocked(notionFetch).mockImplementation(async (path: string) => {
      if (path === '/v1/data_sources/products/query') {
        return jsonResponse({
          results: [makeProductPage()],
          has_more: false,
          next_cursor: null
        });
      }

      if (path === '/v1/blocks/product-1/children') {
        return jsonResponse(
          blockChildrenWithImage('https://example.com/product-block.jpg')
        );
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    const response = await queryProducts(mockEnv, { pageSize: 1 }, 'https://woodzpacker.test');

    expect(response.items).toHaveLength(1);
    expect(response.items[0].thumbnail).toBe('https://example.com/product-block.jpg');
    expect(response.items[0].gallery[0]).toBe('https://example.com/product-block.jpg');
  });

  it('uses the first product image block for /v1/product/:id detail thumbnails', async () => {
    vi.mocked(notionFetch).mockImplementation(async (path: string) => {
      if (path === '/v1/data_sources/products/query') {
        return jsonResponse({
          results: [makeProductPage()],
          has_more: false,
          next_cursor: null
        });
      }

      if (path === '/v1/blocks/product-1/children') {
        return jsonResponse(
          blockChildrenWithImage('https://example.com/product-detail-block.jpg')
        );
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    const product = await fetchProductDetailData('prayer-beads', mockEnv, 'https://woodzpacker.test');

    expect(product.thumbnail).toBe('https://example.com/product-detail-block.jpg');
    expect(product.gallery[0]).toBe('https://example.com/product-detail-block.jpg');
  });
});
