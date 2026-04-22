import { NAV_ITEMS } from '../utils/nav';
import {
  ProductDetailData,
  ProductListItem,
  SimplifiedProductBlock,
  getProductPriceLabel
} from './product';

export function renderProductPage(
  product: ProductDetailData,
  requestUrl: URL,
  siteName: string,
  siteTagline: string,
  siteDescription: string
): string {
  const title = product.productName?.trim() || `${siteName} Product`;
  const description = compactExcerpt(
    product.description || product.story || siteDescription,
    180
  );
  const canonicalUrl = new URL(
    `/product/${product.slug || product.id}`,
    requestUrl.origin
  ).toString();
  const images = getProductImages(product);
  const primaryImage = images[0];
  const priceLabel = getProductPriceLabel(product);
  const comparePrice =
    typeof product.discountPrice === 'number' &&
    typeof product.sellingPrice === 'number' &&
    product.discountPrice !== product.sellingPrice
      ? formatMoney(product.sellingPrice)
      : '';
  const scentProfile = product.scentProfile.length
    ? product.scentProfile
    : [product.material || 'Curated Material', product.origin || 'Collector Source'];
  const statusLabel = product.stock > 0
    ? product.status || 'Available'
    : product.status || 'Out of stock';

  return `<!doctype html>
<html class="dark" lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | ${escapeHtml(siteName)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeHtml(title)} | ${escapeHtml(siteName)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    ${primaryImage ? `<meta property="og:image" content="${escapeHtml(primaryImage)}" />` : ''}
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
        background:
          radial-gradient(circle at top left, rgba(233, 195, 73, 0.12), transparent 28%),
          radial-gradient(circle at bottom right, rgba(233, 195, 73, 0.08), transparent 30%),
          #1a120b;
      }
      .thumbnail-btn.active img { filter: grayscale(0); }
      .thumbnail-btn.active { opacity: 1; border-color: rgba(233, 195, 73, 0.4); }
      details > summary { list-style: none; }
      details > summary::-webkit-details-marker { display: none; }
      details[open] .accordion-chevron { transform: rotate(180deg); }
      .accordion-chevron { transition: transform 0.3s ease; }
    </style>
  </head>
  <body class="bg-background text-on-surface font-body selection:bg-primary/30">
    ${renderNav(siteName, siteTagline, requestUrl.pathname)}
    <main class="pt-28 pb-24">
      <section class="px-6 lg:px-10">
        <div class="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div class="overflow-hidden border border-outline-variant/12 bg-surface-container-low">
            <div class="grid min-h-[34rem] md:grid-cols-[5.5rem_minmax(0,1fr)]">
              <div class="flex gap-4 overflow-x-auto border-b border-outline-variant/10 p-4 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
                ${images.map((image, index) => `
                  <button
                    class="thumbnail-btn ${index === 0 ? 'active' : 'opacity-40'} h-20 w-16 shrink-0 overflow-hidden border border-transparent transition-all duration-500"
                    data-src="${escapeHtml(image)}"
                    data-caption="${escapeHtml(scentProfile[index % scentProfile.length])}"
                    type="button"
                  >
                    <img
                      src="${escapeHtml(image)}"
                      alt="${escapeHtml(title)} thumbnail ${index + 1}"
                      class="h-full w-full object-cover grayscale transition-all duration-700 hover:grayscale-0"
                    />
                  </button>
                `).join('')}
              </div>
              <div class="relative min-h-[28rem] overflow-hidden">
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(233,195,73,0.16),transparent_34%)]"></div>
                <img
                  id="main-gallery-image"
                  src="${escapeHtml(primaryImage || '')}"
                  alt="${escapeHtml(title)}"
                  class="h-full w-full object-cover transition-opacity duration-300"
                />
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent px-8 py-10">
                  <p class="font-label text-[10px] uppercase tracking-[0.3em] text-primary/60">Detailed Observation</p>
                  <p id="gallery-caption" class="mt-2 font-headline text-2xl italic text-on-surface/85">${escapeHtml(scentProfile[0])}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="border border-outline-variant/12 bg-surface-container-low/80 backdrop-blur-sm">
            <div class="space-y-8 p-8 lg:p-10">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <a class="font-label text-[10px] uppercase tracking-[0.28em] text-on-surface-variant/60 hover:text-primary transition-colors" href="/products.html">
                  Back to collection
                </a>
                <span class="rounded-full border border-outline-variant/20 px-3 py-1 font-label text-[10px] uppercase tracking-[0.22em] text-primary">${escapeHtml(statusLabel)}</span>
              </div>

              <div>
                <p class="font-label text-[10px] uppercase tracking-[0.35em] text-primary/70">${escapeHtml(product.productCategory || 'Collection')} / ${escapeHtml(product.supplier || siteName)}</p>
                <h1 class="mt-4 font-headline text-4xl leading-tight lg:text-5xl">${escapeHtml(title)}</h1>
                <p class="mt-5 max-w-2xl text-lg leading-relaxed text-on-surface-variant">${escapeHtml(product.description)}</p>
              </div>

              <div class="flex flex-wrap items-end gap-5 border-y border-outline-variant/10 py-6">
                <div>
                  <p class="font-headline text-3xl text-primary">${escapeHtml(priceLabel)}</p>
                  ${comparePrice ? `<p class="mt-2 text-sm text-on-surface-variant/50 line-through">${escapeHtml(comparePrice)}</p>` : ''}
                </div>
                <div class="grid gap-2 text-sm text-on-surface-variant">
                  <p><span class="font-label text-[10px] uppercase tracking-[0.22em] text-primary/70">Stock</span> ${escapeHtml(String(product.stock || 0))}</p>
                  <p><span class="font-label text-[10px] uppercase tracking-[0.22em] text-primary/70">Created</span> ${escapeHtml(formatDate(product.createdTime))}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                ${renderStatCard('Origin', product.origin || 'Curated Source')}
                ${renderStatCard('Grade', product.grade || 'Collection Grade')}
                ${renderStatCard('Density', product.density || 'Balanced')}
                ${renderStatCard('Aged', product.aged || 'By source')}
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <a href="/product_detail.html?id=${encodeURIComponent(product.slug || product.id)}" class="w-full border border-primary bg-primary px-6 py-4 text-center font-label text-xs uppercase tracking-[0.28em] text-on-primary transition-colors hover:bg-primary-fixed-dim">
                  Client Detail View
                </a>
                <a href="/products.html" class="w-full border border-outline-variant/20 px-6 py-4 text-center font-label text-xs uppercase tracking-[0.28em] text-on-surface transition-colors hover:border-primary/30 hover:text-primary">
                  Browse Collection
                </a>
              </div>

              <div class="flex flex-wrap gap-3">
                ${scentProfile.map((note) => `
                  <span class="border border-outline-variant/20 bg-surface/40 px-3 py-2 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/80">
                    ${escapeHtml(note)}
                  </span>
                `).join('')}
              </div>

              <div class="divide-y divide-outline-variant/10">
                ${renderDetails('Product Story', product.story, true)}
                ${renderDetails('Material Origin', product.materialOrigin)}
                ${renderDetails('Care Guide', product.careGuide)}
                ${renderDetails('Shipping Notes', product.shippingNotes)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="px-6 lg:px-10 mt-20">
        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article class="border border-outline-variant/12 bg-surface-container-low p-8 lg:p-10">
            <p class="font-label text-[10px] uppercase tracking-[0.3em] text-primary/70">Material Profile</p>
            <h2 class="mt-4 font-headline text-4xl leading-tight">A slower read on the piece.</h2>
            <p class="mt-6 text-lg leading-relaxed text-on-surface-variant">${escapeHtml(product.story)}</p>
            <div class="mt-8 grid gap-4 md:grid-cols-2">
              ${renderStatCard('Material', product.material || 'Natural Material', true)}
              ${renderStatCard('Size', product.size || 'Collector Size', true)}
              ${renderStatCard('Manufactured', formatDate(product.manufactoryDate), true)}
              ${renderStatCard('Category', product.productCategory || 'Collection', true)}
            </div>
          </article>

          <article class="overflow-hidden border border-outline-variant/12 bg-surface-container-low">
            <div class="relative h-full min-h-[24rem]">
              <img
                src="${escapeHtml(images[Math.min(1, images.length - 1)] || primaryImage || '')}"
                alt="${escapeHtml(title)} contextual image"
                class="h-full w-full object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent"></div>
              <div class="absolute inset-x-0 bottom-0 p-8">
                <p class="font-label text-[10px] uppercase tracking-[0.3em] text-primary/70">Source & Care</p>
                <p class="mt-3 text-lg leading-relaxed text-on-surface-variant">${escapeHtml(product.materialOrigin)}</p>
              </div>
            </div>
          </article>
        </div>
      </section>
      ${renderEditorialSection(product.blocks)}
    </main>
    ${renderFooter(siteName, siteTagline, siteDescription)}
    <script>
      (() => {
        const thumbs = document.querySelectorAll('.thumbnail-btn');
        const mainImg = document.getElementById('main-gallery-image');
        const caption = document.getElementById('gallery-caption');
        thumbs.forEach((btn) => {
          btn.addEventListener('click', () => {
            const src = btn.getAttribute('data-src');
            const text = btn.getAttribute('data-caption');
            if (mainImg && src) {
              mainImg.style.opacity = '0';
              setTimeout(() => {
                mainImg.src = src;
                if (mainImg.complete) mainImg.style.opacity = '1';
                mainImg.onload = () => { mainImg.style.opacity = '1'; };
              }, 160);
            }
            if (caption && text) caption.textContent = text;
            thumbs.forEach((thumb) => {
              thumb.classList.remove('active');
              thumb.classList.add('opacity-40');
            });
            btn.classList.add('active');
            btn.classList.remove('opacity-40');
          });
        });
      })();
    </script>
  </body>
</html>`;
}

function renderNav(siteName: string, siteTagline: string, currentPath: string): string {
  const navLinksHtml = NAV_ITEMS.map((item) => {
    const isActive = item.activeMatch === 'includes'
      ? currentPath.includes(item.activeKey)
      : currentPath === item.activeKey;
    const activeClass = isActive
      ? 'text-[#E9C349] border-b border-[#E9C349]/30 pb-1'
      : 'text-[#F1DFD3]/80';
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
  return `<footer class="w-full border-t border-[#4F4540]/20 bg-[#1A120B] pt-20 pb-12 mt-24">
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

function renderStatCard(label: string, value: string, compact = false): string {
  return `<div class="border border-outline-variant/10 bg-surface/50 ${compact ? 'p-5' : 'p-4'}">
    <p class="font-label text-[10px] uppercase tracking-[0.24em] text-primary/70">${escapeHtml(label)}</p>
    <p class="mt-2 font-headline ${compact ? 'text-2xl' : 'text-lg'}">${escapeHtml(value)}</p>
  </div>`;
}

function renderDetails(title: string, body: string, open = false): string {
  return `<details class="group py-5" ${open ? 'open' : ''}>
    <summary class="flex cursor-pointer items-center justify-between">
      <span class="font-label text-xs uppercase tracking-[0.22em] text-on-surface/80 group-hover:text-primary transition-colors">${escapeHtml(title)}</span>
      <span class="material-symbols-outlined accordion-chevron text-sm text-outline">expand_more</span>
    </summary>
    <div class="pt-4 text-sm leading-relaxed text-on-surface-variant">${escapeHtml(body)}</div>
  </details>`;
}

function getProductImages(product: ProductListItem): string[] {
  const images = product.gallery.filter(Boolean);
  if (images.length) {
    return images;
  }

  if (product.thumbnail) {
    return [product.thumbnail];
  }

  return [];
}

function renderEditorialSection(blocks: SimplifiedProductBlock[]): string {
  if (!blocks.length) {
    return '';
  }

  return `<section class="px-6 lg:px-10 mt-20">
    <div class="border border-outline-variant/12 bg-surface-container-low p-8 lg:p-10">
      <div class="mb-10 border-b border-outline-variant/10 pb-6">
        <p class="font-label text-[10px] uppercase tracking-[0.3em] text-primary/70">Extended Notes</p>
        <h2 class="mt-4 font-headline text-4xl leading-tight">Primary source content from the product record.</h2>
      </div>
      <article class="mx-auto max-w-3xl text-lg leading-relaxed">
        ${renderBlocks(blocks)}
      </article>
    </div>
  </section>`;
}

function renderBlocks(blocks: SimplifiedProductBlock[]): string {
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

function renderBlock(block: SimplifiedProductBlock): string {
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
      return `<figure class="my-12">
        <div class="bg-surface p-3 md:p-4">
          <img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.caption || 'Product image')}" class="w-full h-auto object-cover max-h-[42rem]" />
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

function renderListItem(block: SimplifiedProductBlock, listType: 'ul' | 'ol'): string {
  const nested = renderNestedChildren(block.children || [], listType);
  return `<li class="mb-3">${escapeHtml(block.text || '')}${nested}</li>`;
}

function renderNestedChildren(
  children: SimplifiedProductBlock[],
  parentListType: 'ul' | 'ol'
): string {
  if (!children.length) return '';

  const childListType =
    children[0].type === 'numbered_list_item' ? 'ol' : parentListType;
  const className =
    childListType === 'ol'
      ? 'mt-3 pl-6 list-decimal text-on-surface/90 leading-[1.9]'
      : 'mt-3 pl-6 list-disc text-on-surface/90 leading-[1.9]';

  const items = children
    .map((child) => {
      if (
        child.type === 'bulleted_list_item' ||
        child.type === 'numbered_list_item'
      ) {
        return renderListItem(child, childListType);
      }
      return renderBlock(child);
    })
    .join('');

  return `<${childListType} class="${className}">${items}</${childListType}>`;
}

function renderTable(block: SimplifiedProductBlock): string {
  const rows = Array.isArray(block.children) ? block.children : [];
  if (!rows.length) return '';

  const body = rows
    .filter((row) => row.type === 'table_row')
    .map((row) => {
      const cells = Array.isArray(row.cells) ? row.cells : [];
      const columns = cells
        .map((cell) => {
          const text = Array.isArray(cell) ? cell.join(' ') : '';
          return `<td class="border border-outline-variant/20 px-4 py-3 align-top">${escapeHtml(text)}</td>`;
        })
        .join('');

      return `<tr>${columns}</tr>`;
    })
    .join('');

  return `<div class="my-10 overflow-x-auto bg-surface border border-outline-variant/20">
    <table class="min-w-full border-collapse text-left text-base">
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

function compactExcerpt(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
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
