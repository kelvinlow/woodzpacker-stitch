import { Env, NotionBlock } from '../types';
import { NAV_ITEMS } from '../utils/nav';

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=300'
};

export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: HTML_HEADERS
  });
}

export function renderArticlePage(
  articleId: string,
  articleSlug: string,
  articleTitle: string,
  blocks: NotionBlock[],
  requestUrl: URL,
  siteName: string,
  siteTagline: string,
  siteDescription: string
): string {
  const introBlock = getFirstParagraph(blocks);
  const heroImage = getFirstImage(blocks);
  const title = articleTitle?.trim() || `${siteName} Journal`;
  const description = compactExcerpt(
    introBlock?.text?.trim() || siteDescription,
    180
  );
  const canonicalUrl = new URL(
    `/article/${articleSlug || articleId}`,
    requestUrl.origin
  ).toString();

  return `<!doctype html>
<html class="dark" lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | ${escapeHtml(siteName)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)} | ${escapeHtml(siteName)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    ${heroImage?.url ? `<meta property="og:image" content="${escapeHtml(heroImage.url)}" />` : ''}
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <script>
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              "on-primary-fixed-variant": "#574500",
              "on-error-container": "#ffdad6",
              "surface-container-lowest": "#140d06",
              "secondary": "#dec1b3",
              "surface-container-low": "#221a13",
              "surface": "#1a120b",
              "secondary-fixed-dim": "#dec1b3",
              "outline": "#9b8e88",
              "on-primary-fixed": "#241a00",
              "error": "#ffb4ab",
              "background": "#1a120b",
              "surface-bright": "#42372f",
              "primary-fixed": "#ffe088",
              "on-secondary": "#3f2c23",
              "tertiary": "#c8c8af",
              "on-secondary-container": "#cbafa2",
              "on-tertiary-fixed": "#1b1d0d",
              "on-secondary-fixed-variant": "#574238",
              "outline-variant": "#4f4540",
              "surface-tint": "#e9c349",
              "error-container": "#93000a",
              "secondary-container": "#574238",
              "inverse-primary": "#735c00",
              "tertiary-fixed": "#e4e4ca",
              "on-primary": "#3c2f00",
              "tertiary-container": "#2e2f1e",
              "on-error": "#690005",
              "on-tertiary-container": "#969780",
              "surface-container-high": "#322820",
              "on-tertiary-fixed-variant": "#474835",
              "primary": "#e9c349",
              "inverse-on-surface": "#382f26",
              "surface-dim": "#1a120b",
              "primary-fixed-dim": "#e9c349",
              "inverse-surface": "#f1dfd3",
              "on-primary-container": "#b49218",
              "tertiary-fixed-dim": "#c8c8af",
              "on-tertiary": "#303220",
              "on-surface": "#f1dfd3",
              "surface-container": "#271e16",
              "on-secondary-fixed": "#281810",
              "primary-container": "#3a2c00",
              "on-background": "#f1dfd3",
              "surface-variant": "#3d332b",
              "secondary-fixed": "#fbdcce",
              "on-surface-variant": "#d3c3bd",
              "surface-container-highest": "#3d332b"
            },
            borderRadius: {
              DEFAULT: "0.125rem",
              lg: "0.25rem",
              xl: "0.5rem",
              full: "0.75rem"
            },
            fontFamily: {
              headline: ["Noto Serif"],
              body: ["Newsreader"],
              label: ["Manrope"]
            }
          }
        }
      };
    </script>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&family=Newsreader:ital,wght@0,400;0,600;1,400&family=Manrope:wght@300;500;700&display=swap" />
    <style>
      body {
        background: radial-gradient(circle at top, rgba(233, 195, 73, 0.08), transparent 35%), #1a120b;
      }
    </style>
  </head>
  <body class="bg-background text-on-surface font-body selection:bg-primary/30">
    ${renderNav(siteName, siteTagline, requestUrl.pathname)}
    <main class="pt-32 pb-24">
      <div class="max-w-6xl mx-auto px-6 md:px-8">
        ${renderHero(articleId, title, description, heroImage)}
        <article class="max-w-3xl mx-auto text-lg leading-relaxed">
          <div class="mb-12 pb-8 border-b border-outline-variant/10">
            <p class="font-label text-[10px] tracking-[0.35em] uppercase text-on-surface-variant">
              Server-rendered article
            </p>
          </div>
          ${renderBlocks(blocks)}
        </article>
      </div>
    </main>
    ${renderFooter(siteName, siteTagline, siteDescription)}
  </body>
</html>`;
}

export function renderHomePage(siteName: string, origin: string): string {
  const exampleId = '33c63a7bb3db80298069dc4f9a6b60fa';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(siteName)} Worker</title>
  </head>
  <body style="font-family: sans-serif; padding: 40px;">
    <h1>${escapeHtml(siteName)} Worker</h1>
    <p>Article page: <a href="${escapeHtml(`${origin}/article/${exampleId}`)}">${escapeHtml(`${origin}/article/${exampleId}`)}</a></p>
    <p>Article API: <a href="${escapeHtml(`${origin}/v1/article/${exampleId}`)}">${escapeHtml(`${origin}/v1/article/${exampleId}`)}</a></p>
  </body>
</html>`;
}

export function renderErrorPage(message: string, siteName: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Error | ${escapeHtml(siteName)}</title>
  </head>
  <body style="font-family: sans-serif; padding: 40px;">
    <h1>${escapeHtml(siteName)}</h1>
    <p>${escapeHtml(message)}</p>
  </body>
</html>`;
}

function renderNav(siteName: string, siteTagline: string, currentPath: string): string {
  const navLinksHtml = NAV_ITEMS.map(item => {
    const isActive = item.activeMatch === 'includes'
      ? currentPath.includes(item.activeKey)
      : currentPath === item.activeKey;
    const activeClass = isActive ? 'text-[#E9C349] border-b border-[#E9C349]/30 pb-1' : 'text-[#F1DFD3]/80';
    return `<a class="font-label tracking-widest uppercase text-sm ${activeClass} hover:text-[#E9C349] transition-colors duration-700" href="${escapeHtml(item.workerHref || item.href)}">${escapeHtml(item.label)}</a>`;
  }).join('\n        ');

  return `<nav class="fixed top-0 w-full z-50 bg-[#1A120B]/70 backdrop-blur-md bg-gradient-to-b from-[#1A120B] to-transparent shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
    <div class="flex justify-between items-center px-6 md:px-12 py-6 w-full max-w-screen-2xl mx-auto gap-6">
      <div class="text-xl font-headline font-bold tracking-tighter text-[#F1DFD3]">
        <span class="text-[#E9C349]">${escapeHtml(siteName)} </span> | ${escapeHtml(siteTagline)}
      </div>
      <div class="hidden md:flex gap-10 items-center">
        ${navLinksHtml}
      </div>
    </div>
  </nav>`;
}

function renderFooter(siteName: string, siteTagline: string, siteDescription: string): string {
  return `<footer class="w-full border-t border-[#4F4540]/20 bg-[#1A120B] pt-20 pb-12">
    <div class="max-w-screen-2xl mx-auto px-6 md:px-12">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
        <div class="md:col-span-5 space-y-6">
          <div class="text-2xl font-headline font-bold tracking-tighter text-[#F1DFD3]">
            <span class="text-[#E9C349]">${escapeHtml(siteName)} ${escapeHtml(siteTagline)}</span>
          </div>
          <p class="font-body text-[#F1DFD3]/60 text-lg leading-relaxed max-w-md">
            ${escapeHtml(siteDescription)}
          </p>
        </div>
      </div>
      <div class="pt-8 border-t border-[#4F4540]/10">
        <div class="font-label text-[10px] tracking-[0.4em] text-[#F1DFD3]/30 uppercase">
          ${escapeHtml(siteName)} ${escapeHtml(siteTagline)}
        </div>
      </div>
    </div>
  </footer>`;
}

function renderHero(
  articleId: string,
  title: string,
  description: string,
  imageBlock?: NotionBlock
): string {
  return `<header class="mb-20 md:mb-24">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
      <div class="md:col-span-7">
        <div class="inline-flex items-center gap-4 mb-6">
          <span class="font-label text-xs tracking-[0.35em] uppercase text-primary">Journal Entry</span>
          <span class="w-12 h-px bg-outline-variant"></span>
          <span class="font-label text-[10px] tracking-[0.3em] uppercase text-on-surface-variant">Article ${escapeHtml(articleId.slice(0, 8))}</span>
        </div>
        <h1 class="font-headline text-4xl md:text-6xl leading-tight mb-6">${escapeHtml(title)}</h1>
        <p class="text-xl md:text-2xl italic text-on-surface-variant leading-relaxed max-w-2xl">
          ${escapeHtml(description)}
        </p>
      </div>
      <div class="md:col-span-5">
        ${
          imageBlock?.url
            ? `<figure class="relative overflow-hidden bg-surface-container-low aspect-[4/5]">
                <img src="${escapeHtml(imageBlock.url)}" alt="${escapeHtml(imageBlock.caption || title)}" class="w-full h-full object-cover opacity-90" />
                <div class="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent"></div>
              </figure>`
            : `<div class="aspect-[4/5] bg-surface-container border border-outline-variant/20 flex items-end p-8">
                <p class="font-headline text-3xl text-primary italic">沉香 · Journal</p>
              </div>`
        }
      </div>
    </div>
  </header>`;
}

function renderBlocks(blocks: NotionBlock[]): string {
  const rendered: string[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.type === 'bulleted_list_item') {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
        items.push(renderListItem(blocks[i], 'ul'));
        i += 1;
      }
      rendered.push(
        `<ul class="mb-8 pl-6 list-disc text-on-surface/90 leading-[1.9]">${items.join('')}</ul>`
      );
      continue;
    }

    if (block.type === 'numbered_list_item') {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
        items.push(renderListItem(blocks[i], 'ol'));
        i += 1;
      }
      rendered.push(
        `<ol class="mb-8 pl-6 list-decimal text-on-surface/90 leading-[1.9]">${items.join('')}</ol>`
      );
      continue;
    }

    rendered.push(renderBlock(block));
    i += 1;
  }

  return rendered.join('');
}

function renderBlock(block: NotionBlock): string {
  const text = escapeHtml(block.text || '');

  switch (block.type) {
    case 'heading_1':
      return `<section class="mt-16 mb-6"><h2 class="font-headline text-3xl md:text-4xl text-primary leading-tight">${text}</h2></section>`;
    case 'heading_2':
      return `<section class="mt-14 mb-5"><h3 class="font-headline text-2xl md:text-3xl text-on-surface leading-snug">${text}</h3></section>`;
    case 'heading_3':
      return `<section class="mt-10 mb-4"><h4 class="font-label text-sm tracking-[0.25em] uppercase text-secondary">${text}</h4></section>`;
    case 'paragraph':
      if (!text.trim()) return '';
      return `<p class="mb-6 text-on-surface/90 leading-[1.95]">${text}</p>`;
    case 'image':
      if (!block.url) return '';
      return `<figure class="my-12 md:my-16 -mx-4 md:-mx-12">
        <div class="bg-surface-container-low p-3 md:p-4">
          <img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.caption || 'Article image')}" class="w-full h-auto object-cover max-h-[42rem]" />
          ${block.caption ? `<figcaption class="mt-4 text-center font-body italic text-sm text-on-surface-variant">${escapeHtml(block.caption)}</figcaption>` : ''}
        </div>
      </figure>`;
    case 'table':
      return renderTable(block);
    case 'table_row':
      return '';
    case 'divider':
      return `<div class="my-12 border-t border-outline-variant/20"></div>`;
    default:
      return '';
  }
}

function getFirstParagraph(blocks: NotionBlock[]): NotionBlock | undefined {
  return blocks.find((block) => block.type === 'paragraph' && block.text?.trim());
}

function getFirstImage(blocks: NotionBlock[]): NotionBlock | undefined {
  return blocks.find((block) => block.type === 'image' && block.url);
}

function compactExcerpt(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderListItem(block: NotionBlock, listType: 'ul' | 'ol'): string {
  const nested = renderNestedChildren(block.children || [], listType);
  return `<li class="mb-3">${escapeHtml(block.text || '')}${nested}</li>`;
}

function renderNestedChildren(
  children: NotionBlock[],
  parentListType: 'ul' | 'ol'
): string {
  if (!children.length) {
    return '';
  }

  const childListType = children[0].type === 'numbered_list_item' ? 'ol' : parentListType;
  const className =
    childListType === 'ol'
      ? 'mt-3 pl-6 list-decimal text-on-surface/90 leading-[1.9]'
      : 'mt-3 pl-6 list-disc text-on-surface/90 leading-[1.9]';

  const items = children
    .map((child) => {
      if (child.type === 'bulleted_list_item' || child.type === 'numbered_list_item') {
        return renderListItem(child, childListType);
      }
      return renderBlock(child);
    })
    .join('');

  return `<${childListType} class="${className}">${items}</${childListType}>`;
}

function renderTable(block: NotionBlock): string {
  const rows = Array.isArray(block.children) ? block.children : [];
  if (!rows.length) {
    return '';
  }

  const body = rows
    .filter((row) => row.type === 'table_row')
    .map((row) => {
      const cells = Array.isArray(row.cells) ? row.cells : [];
      const columns = cells
        .map(
          (cell) =>
            `<td class="border border-outline-variant/20 px-4 py-3 align-top">${escapeHtml(
              Array.isArray(cell) ? cell.join(' ') : ''
            )}</td>`
        )
        .join('');

      return `<tr>${columns}</tr>`;
    })
    .join('');

  return `<div class="my-10 overflow-x-auto bg-surface-container-low border border-outline-variant/20">
    <table class="min-w-full border-collapse text-left text-base">
      <tbody>${body}</tbody>
    </table>
  </div>`;
}
