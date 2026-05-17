import { Env } from '../types';
import { queryArticles } from './feed';
import { queryProducts } from './product';

export async function handleSitemap(env: Env, baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/g, '');

  // 1. Static pages
  const staticPaths = [
    "/",
    "/aboutus",
    "/products",
    "/gallery",
    "/guide",
    "/agarwood",
    "/zenith",
    "/article-list"
  ];

  const staticUrls = staticPaths.map(path => `
    <url>
      <loc>${normalizedBaseUrl}${path}</loc>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>
  `).join("");

  // 2. Fetch dynamic articles & products
  const [articles, products] = await Promise.all([
    queryArticles(env, { pageSize: 1000 }, normalizedBaseUrl),
    queryProducts(env, { pageSize: 1000 }, normalizedBaseUrl)
  ]);

  const articleUrls = articles.items.map(article => `
    <url>
      <loc>${normalizedBaseUrl}/article/${article.slug}</loc>
      <changefreq>monthly</changefreq>
      <priority>0.6</priority>
      ${article.thumbnail ? `
      <image:image>
        <image:loc>${article.thumbnail}</image:loc>
        <image:title>${article.title}</image:title>
      </image:image>` : ''}
      <lastmod>${article.createdAt}</lastmod>
    </url>
  `).join("");

  const productUrls = products.items.map(product => `
    <url>
      <loc>${normalizedBaseUrl}/product/${product.slug || product.id}</loc>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
      ${product.thumbnail ? `
      <image:image>
        <image:loc>${product.thumbnail}</image:loc>
        <image:title>${product.productName}</image:title>
      </image:image>` : ''}
      <lastmod>${product.createdTime}</lastmod>
    </url>
  `).join("");  

  // 3. Combine XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  >
    ${staticUrls}
    ${articleUrls}
    ${productUrls}
  </urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
