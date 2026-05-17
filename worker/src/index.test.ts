import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from './types';

vi.mock('./handlers/feed', () => ({
  handleFeed: vi.fn()
}));

vi.mock('./handlers/article', () => ({
  fetchArticleDetailData: vi.fn(),
  handleArticleCollection: vi.fn(),
  handleArticleDetail: vi.fn()
}));

vi.mock('./handlers/product', () => ({
  fetchProductDetailData: vi.fn(),
  handleProductCollection: vi.fn(),
  handleProductDetail: vi.fn()
}));

vi.mock('./handlers/search', () => ({
  handleSearch: vi.fn()
}));

vi.mock('./handlers/sitemap', () => ({
  handleSitemap: vi.fn()
}));

vi.mock('./handlers/articlePage', () => ({
  htmlResponse: vi.fn(),
  renderArticlePage: vi.fn(),
  renderErrorPage: vi.fn()
}));

vi.mock('./handlers/productPage', () => ({
  renderProductPage: vi.fn()
}));

const { default: worker } = await import('./index');
const { handleFeed } = await import('./handlers/feed');
const {
  fetchArticleDetailData,
  handleArticleCollection,
  handleArticleDetail
} = await import('./handlers/article');
const {
  fetchProductDetailData,
  handleProductCollection,
  handleProductDetail
} = await import('./handlers/product');
const { handleSearch } = await import('./handlers/search');
const { handleSitemap } = await import('./handlers/sitemap');
const {
  htmlResponse,
  renderArticlePage,
  renderErrorPage
} = await import('./handlers/articlePage');
const { renderProductPage } = await import('./handlers/productPage');

const mockEnv: Env = {
  NOTION_TOKEN: 'token',
  ARTICLE_DATA_SOURCE_ID: 'articles',
  PRODUCT_DATA_SOURCE_ID: 'products',
  NOTION_API_VERSION: '2026-03-11'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('worker api routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(handleFeed).mockResolvedValue(jsonResponse({ route: 'feed' }));
    vi.mocked(handleArticleCollection).mockResolvedValue(
      jsonResponse({ route: 'article-collection' })
    );
    vi.mocked(handleArticleDetail).mockResolvedValue(
      jsonResponse({ route: 'article-detail' })
    );
    vi.mocked(handleProductCollection).mockResolvedValue(
      jsonResponse({ route: 'product-collection' })
    );
    vi.mocked(handleProductDetail).mockResolvedValue(
      jsonResponse({ route: 'product-detail' })
    );
    vi.mocked(handleSearch).mockResolvedValue(jsonResponse({ route: 'search' }));
    vi.mocked(handleSitemap).mockResolvedValue(
      new Response('<xml />', {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    );
    vi.mocked(renderArticlePage).mockReturnValue('<html>article</html>');
    vi.mocked(renderProductPage).mockReturnValue('<html>product</html>');
    vi.mocked(renderErrorPage).mockReturnValue('<html>error</html>');
    vi.mocked(htmlResponse).mockImplementation(
      (html: string, status = 200) => new Response(html, { status })
    );
  });

  it('returns 404 for non-worker routes without checking env', async () => {
    const response = await worker.fetch(
      new Request('https://woodzpacker.test/not-a-worker-route'),
      {}
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Route not found'
    });
  });

  it('returns a configuration error when NOTION_TOKEN is missing on worker routes', async () => {
    const response = await worker.fetch(
      new Request('https://woodzpacker.test/v1/feed'),
      {}
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Missing NOTION_TOKEN secret.'
    });
  });

  it('routes /sitemap.xml to the sitemap handler', async () => {
    const response = await worker.fetch(
      new Request('https://woodzpacker.test/sitemap.xml'),
      mockEnv
    );

    expect(handleSitemap).toHaveBeenCalledWith(mockEnv);
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('<xml />');
  });

  it('parses feed query parameters and forwards them to handleFeed', async () => {
    await worker.fetch(
      new Request(
        'https://woodzpacker.test/v1/feed?pageNumber=2&pageSize=7&category=ritual&q=oud'
      ),
      mockEnv
    );

    expect(handleFeed).toHaveBeenCalledWith(mockEnv, 2, 7, 'ritual', 'oud');
  });

  it('routes article collection requests with parsed parameters', async () => {
    await worker.fetch(
      new Request(
        'https://woodzpacker.test/v1/article?pageNumber=3&pageSize=4&category=knowledge&q=kinam'
      ),
      mockEnv
    );

    expect(handleArticleCollection).toHaveBeenCalledWith(
      mockEnv,
      3,
      4,
      'knowledge',
      'kinam'
    );
  });

  it('routes search requests with defaults', async () => {
    await worker.fetch(
      new Request('https://woodzpacker.test/v1/search?query=resin'),
      mockEnv
    );

    expect(handleSearch).toHaveBeenCalledWith(mockEnv, 'resin', '', 1, 8);
  });

  it('routes product collection requests with sort and paging', async () => {
    await worker.fetch(
      new Request(
        'https://woodzpacker.test/v1/product?pageNumber=5&pageSize=12&category=beads&q=mala&sort=price-asc'
      ),
      mockEnv
    );

    expect(handleProductCollection).toHaveBeenCalledWith(
      mockEnv,
      5,
      12,
      'beads',
      'mala',
      'price-asc'
    );
  });

  it('routes /v1/article/:id to the article detail handler', async () => {
    await worker.fetch(
      new Request('https://woodzpacker.test/v1/article/article-123'),
      mockEnv
    );

    expect(handleArticleDetail).toHaveBeenCalledWith('article-123', mockEnv);
  });

  it('routes /v1/product/:id to the product detail handler', async () => {
    await worker.fetch(
      new Request('https://woodzpacker.test/v1/product/product-123'),
      mockEnv
    );

    expect(handleProductDetail).toHaveBeenCalledWith('product-123', mockEnv);
  });

  it('redirects article pages when the requested slug is not canonical', async () => {
    vi.mocked(fetchArticleDetailData).mockResolvedValue({
      id: 'article-id',
      slug: 'canonical-article',
      title: 'Article',
      blocks: []
    });

    const response = await worker.fetch(
      new Request('https://woodzpacker.test/article/outdated-slug'),
      mockEnv
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe(
      'https://woodzpacker.test/article/canonical-article'
    );
  });

  it('renders canonical article pages when the slug matches', async () => {
    vi.mocked(fetchArticleDetailData).mockResolvedValue({
      id: 'article-id',
      slug: 'canonical-article',
      title: 'Article Title',
      blocks: [{ id: 'block-1', type: 'paragraph', text: 'Intro' }]
    });

    const response = await worker.fetch(
      new Request('https://woodzpacker.test/article/canonical-article'),
      mockEnv
    );

    expect(renderArticlePage).toHaveBeenCalledWith(
      'article-id',
      'canonical-article',
      'Article Title',
      [{ id: 'block-1', type: 'paragraph', text: 'Intro' }],
      expect.any(URL),
      'Woodzpacker',
      '沉香',
      '专注于马来西亚野生沉香与佛教珍品的交流'
    );
    expect(htmlResponse).toHaveBeenCalledWith('<html>article</html>');
    expect(response.status).toBe(200);
  });

  it('redirects product pages when the requested slug is not canonical', async () => {
    vi.mocked(fetchProductDetailData).mockResolvedValue({
      id: 'product-id',
      slug: 'canonical-product'
    } as any);

    const response = await worker.fetch(
      new Request('https://woodzpacker.test/product/outdated-product'),
      mockEnv
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe(
      'https://woodzpacker.test/product/canonical-product'
    );
  });

  it('renders canonical product pages when the slug matches', async () => {
    vi.mocked(fetchProductDetailData).mockResolvedValue({
      id: 'product-id',
      slug: 'canonical-product'
    } as any);

    const response = await worker.fetch(
      new Request('https://woodzpacker.test/product/canonical-product'),
      mockEnv
    );

    expect(renderProductPage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'product-id',
        slug: 'canonical-product'
      }),
      expect.any(URL),
      'Woodzpacker',
      '沉香',
      '专注于马来西亚野生沉香与佛教珍品的交流'
    );
    expect(htmlResponse).toHaveBeenCalledWith('<html>product</html>');
    expect(response.status).toBe(200);
  });
});
