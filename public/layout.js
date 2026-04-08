/**
 * Layout.js - Master Template for Woodzpacker Project
 * Handles shared head, nav, footer injection and global variable interpolation.
 */

// Global Configuration
const GLOBAL_CONFIG = {
  websiteName: "Woodzpacker",
  tagline: "沉香",
  workerBaseUrl: "https://woodzpacker-stitch.lowshinsheng.workers.dev",
  footerTitle: "冥想虚空 THE MEDITATIVE VOID",
  footerSlogan: "悟培閣 · {{footerTitle}}",
  footerDescription: "专注于马来西亚野生沉香与佛教珍品<br/>品质至上，诚信经营"
};

window.WOODZPACKER_CONFIG = {
  ...GLOBAL_CONFIG,
  workerBaseUrl: GLOBAL_CONFIG.workerBaseUrl.replace(/\/+$/, '')
};

// Simple template interpolation
const interpolate = (str) => {
  return str.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const val = GLOBAL_CONFIG[key.trim()] || match;
    // If the value itself contains curly braces, interpolate it recursively (one level)
    if (typeof val === 'string' && val.includes('{{')) {
      return interpolate(val);
    }
    return val;
  });
};

// 1. Initial Head Setup (Run immediately)
const setupHead = () => {
  // Process Page Title immediately
  document.title = interpolate(document.title);

  // Add Tailwind CSS (Synchronous Script)
  if (!document.querySelector('script[src*="tailwindcss"]')) {
    document.write('<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>');
  }

  // Add Google Fonts and Shared Stlyes (Synchronous Link)
  const fonts = [
    "https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&family=Newsreader:ital,wght@0,400;0,600;1,400&family=Manrope:wght@300;500;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
  ];
  fonts.forEach(url => {
    document.write(`<link rel="stylesheet" href="${url}">`);
  });

  // Inject Shared style.css
  document.write('<link rel="stylesheet" href="style.css">');

  // Setup Tailwind Config
  window.tailwindConfig = {
    darkMode: "class",
    theme: {
      extend: {
        "colors": {
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
        "borderRadius": {
          "DEFAULT": "0.125rem",
          "lg": "0.25rem",
          "xl": "0.5rem",
          "full": "0.75rem"
        },
        "fontFamily": {
          "headline": ["Noto Serif"],
          "body": ["Newsreader"],
          "label": ["Manrope"]
        }
      },
    },
  };

  const pollTailwind = setInterval(() => {
    if (window.tailwind) {
      window.tailwind.config = window.tailwindConfig;
      clearInterval(pollTailwind);
    }
  }, 50);
};

// 2. Main Logic - Inject Header & Footer
const injectLayout = () => {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  // Navigation HTML
  const navHTML = interpolate(`
<nav class="fixed top-0 w-full z-50 bg-[#1A120B]/70 backdrop-blur-md bg-gradient-to-b from-[#1A120B] to-transparent shadow-[0_4px_30_rgba(0,0,0,0.1)]">
    <div class="flex justify-between items-center px-12 py-6 w-full max-w-screen-2xl mx-auto">
        <div class="text-xl font-headline font-bold tracking-tighter text-[#F1DFD3]">
            <span class="text-[#E9C349]">{{websiteName}} </span> | {{tagline}}
        </div>
        <div class="hidden md:flex gap-10 items-center">
            <a class="font-label tracking-widest uppercase text-sm ${currentPage.includes('articles') ? 'text-[#E9C349] border-b border-[#E9C349]/30 pb-1' : 'text-[#F1DFD3]/80'} hover:text-[#E9C349] transition-colors duration-700" href="articles_1.html">Articles</a>
            <a class="font-label tracking-widest uppercase text-sm ${currentPage === 'gallery.html' ? 'text-[#E9C349] border-b border-[#E9C349]/30 pb-1' : 'text-[#F1DFD3]/80'} hover:text-[#E9C349] transition-colors duration-700" href="gallery.html">Gallery</a>
            <a class="font-label tracking-widest uppercase text-sm ${currentPage === 'guide.html' ? 'text-[#E9C349] border-b border-[#E9C349]/30 pb-1' : 'text-[#F1DFD3]/80'} hover:text-[#E9C349] transition-colors duration-700" href="guide.html">Guide</a>
            <a class="font-label tracking-widest uppercase text-sm ${currentPage.includes('products') ? 'text-[#E9C349] border-b border-[#E9C349]/30 pb-1' : 'text-[#F1DFD3]/80'} hover:text-[#E9C349] transition-colors duration-700" href="products_1.html">Products</a>
            <a class="font-label tracking-widest uppercase text-sm ${currentPage === 'about_us.html' ? 'text-[#E9C349] border-b border-[#E9C349]/30 pb-1' : 'text-[#F1DFD3]/80'} hover:text-[#E9C349] transition-colors duration-700" href="about_us.html">About</a>
        </div>
        <div class="flex items-center gap-6">
            <button class="text-[#F1DFD3]/80 hover:text-[#E9C349] transition-colors duration-700">
                <span class="material-symbols-outlined">phone_in_talk</span>
            </button>
        </div>
    </div>
</nav>`);

  // Footer HTML (Redesigned for Premium Look)
  const footerHTML = interpolate(`
<footer class="w-full border-t border-[#4F4540]/20 bg-[#1A120B] pt-24 pb-12">
    <div class="max-w-screen-2xl mx-auto px-12">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
            <!-- Brand Column -->
            <div class="md:col-span-5 space-y-8">
                <div class="text-2xl font-headline font-bold tracking-tighter text-[#F1DFD3]">
                    <span class="text-[#E9C349]">{{websiteName}} {{tagline}}</span>
                </div>
                <div class="space-y-4">
                    <p class="font-headline text-xl text-[#F1DFD3]/90 italic leading-relaxed">
                        {{footerSlogan}}
                    </p>
                    <p class="font-body text-[#F1DFD3]/60 text-lg leading-relaxed max-w-md">
                        {{footerDescription}}
                    </p>
                </div>
                <div class="flex items-center gap-6 pt-4">
                    <a href="#" class="text-[#F1DFD3]/40 hover:text-[#E9C349] transition-colors duration-500">
                        <span class="font-label text-xs tracking-widest uppercase">Instagram</span>
                    </a>
                    <a href="#" class="text-[#F1DFD3]/40 hover:text-[#E9C349] transition-colors duration-500">
                        <span class="font-label text-xs tracking-widest uppercase">WeChat</span>
                    </a>
                </div>
            </div>

            <!-- Links Columns -->
            <div class="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
                <div class="space-y-6">
                    <h4 class="font-label text-[#E9C349] text-xs tracking-[0.3em] uppercase">Discovery</h4>
                    <ul class="space-y-4">
                        <li><a href="articles_1.html" class="font-body text-[#F1DFD3]/60 hover:text-[#E9C349] transition-colors">Journal</a></li>
                        <li><a href="gallery.html" class="font-body text-[#F1DFD3]/60 hover:text-[#E9C349] transition-colors">Gallery</a></li>
                        <li><a href="guide.html" class="font-body text-[#F1DFD3]/60 hover:text-[#E9C349] transition-colors">Beginner's Guide</a></li>
                    </ul>
                </div>
                <div class="space-y-6">
                    <h4 class="font-label text-[#E9C349] text-xs tracking-[0.3em] uppercase">Shop</h4>
                    <ul class="space-y-4">
                        <li><a href="products_1.html" class="font-body text-[#F1DFD3]/60 hover:text-[#E9C349] transition-colors">Collection</a></li>
                        <li><a href="product_detail_1.html" class="font-body text-[#F1DFD3]/60 hover:text-[#E9C349] transition-colors">Gift Sets</a></li>
                        <li><a href="about_us.html" class="font-body text-[#F1DFD3]/60 hover:text-[#E9C349] transition-colors">Heritage</a></li>
                    </ul>
                </div>
                <div class="space-y-6">
                    <h4 class="font-label text-[#E9C349] text-xs tracking-[0.3em] uppercase">Contact</h4>
                    <ul class="space-y-4">
                        <li><a href="#" class="font-body text-[#F1DFD3]/60 hover:text-[#E9C349] transition-colors">Store Locator</a></li>
                        <li><a href="#" class="font-body text-[#F1DFD3]/60 hover:text-[#E9C349] transition-colors">Customer Care</a></li>
                        <li><a href="#" class="font-body text-[#F1DFD3]/60 hover:text-[#E9C349] transition-colors">Privacy Policy</a></li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Copyright Line -->
        <div class="pt-12 border-t border-[#4F4540]/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div class="font-label text-[10px] tracking-[0.4em] text-[#F1DFD3]/30 uppercase">
                © 2024 {{websiteName}} {{tagline}}. ALL RIGHTS RESERVED.
            </div>
            <div class="flex items-center gap-8">
                <span class="font-label text-[10px] tracking-widest text-[#F1DFD3]/20 uppercase">Handcrafted with time</span>
                <span class="font-label text-[10px] tracking-widest text-[#F1DFD3]/20 uppercase">SCN-MY2024</span>
            </div>
        </div>
    </div>
</footer>`);

  // Inject into body
  document.body.insertAdjacentHTML('afterbegin', navHTML);
  document.body.insertAdjacentHTML('beforeend', footerHTML);

  // Final Revelation
  setTimeout(() => {
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
    document.body.classList.add('transition-opacity', 'duration-700');
  }, 10);
};

// Execution
setupHead();

// Fail-safe: Reveal body if something goes wrong
setTimeout(() => {
  if (document.body && document.body.style.visibility !== 'visible') {
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
  }
}, 3000);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectLayout);
} else {
  injectLayout();
}
