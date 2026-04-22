import { Env } from '../types';
import { queryArticles } from './feed';
import { queryProducts } from './product';

export async function handleSitemap(env: Env) {
  const BASE_URL = "https://woodzpacker.com";

  // 1. Static pages
  const staticPaths = [
    "/",
    "/about_us.html",
    "/products.html",
    "/gallery.html",
    "/guide.html",
    "/agarwood.html",
    "/zenith.html",
    "/article-list.html"
  ];

  const staticUrls = staticPaths.map(path => `
    <url>
      <loc>${BASE_URL}${path}</loc>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>
  `).join("");

  // 2. Fetch dynamic articles & products
  const [articles, products] = await Promise.all([
    queryArticles(env, { pageSize: 1000 }),
    queryProducts(env, { pageSize: 1000 })
  ]);

  const articleUrls = articles.items.map(article => `
    <url>
      <loc>${BASE_URL}/article/${article.slug}</loc>
      <changefreq>monthly</changefreq>
      <priority>0.6</priority>
      <image:image>
        <image:loc>${article.thumbnail}</image:loc>
        <image:title>${article.title}</image:title>
      </image:image>
      <lastmod>${article.createdAt}</lastmod>
    </url>
  `).join("");

  const productUrls = products.items.map(product => `
    <url>
      <loc>${BASE_URL}/product/${product.slug || product.id}</loc>
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
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
