import { Env } from '../types';
import { getEnvValue } from './env';

const MEDIA_ROUTE_PREFIX = '/media/';
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export type ImageReference = {
  id: string;
  url: string;
};

export function buildMediaUrl(baseUrl: string, key: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/g, '');
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${normalizedBaseUrl}${MEDIA_ROUTE_PREFIX}${encodedKey}`;
}

export function mediaKeyFromPath(pathname: string): string | null {
  if (!pathname.startsWith(MEDIA_ROUTE_PREFIX)) {
    return null;
  }

  const encodedKey = pathname.slice(MEDIA_ROUTE_PREFIX.length);
  if (!encodedKey) {
    return null;
  }

  return encodedKey
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

export function findFirstImageBlock<T extends { id: string; type: string; url?: string; children?: T[] }>(
  blocks: T[]
): ImageReference | null {
  for (const block of blocks) {
    if (block.type === 'image' && block.url) {
      return {
        id: block.id,
        url: block.url
      };
    }

    if (Array.isArray(block.children) && block.children.length > 0) {
      const nestedImage = findFirstImageBlock(block.children);
      if (nestedImage) {
        return nestedImage;
      }
    }
  }

  return null;
}

export function isNotionHostedFile(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return (
      hostname === 'secure.notion-static.com' ||
      hostname.endsWith('.notion-static.com') ||
      hostname === 'prod-files-secure.s3.us-west-2.amazonaws.com' ||
      (hostname.endsWith('.amazonaws.com') && parsed.searchParams.has('X-Amz-Expires'))
    );
  } catch {
    return false;
  }
}

function inferFileExtension(url: string, contentType?: string | null): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    if (match) {
      return `.${match[1].toLowerCase()}`;
    }
  } catch {
    // fall through
  }

  if (!contentType) {
    return '.bin';
  }

  const normalized = contentType.toLowerCase();
  if (normalized.includes('jpeg')) return '.jpg';
  if (normalized.includes('png')) return '.png';
  if (normalized.includes('gif')) return '.gif';
  if (normalized.includes('webp')) return '.webp';
  if (normalized.includes('svg')) return '.svg';

  return '.bin';
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function buildObjectKey(
  namespace: string,
  pageId: string,
  imageId: string,
  url: string,
  contentType?: string | null
): string {
  const urlPath = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();

  const fingerprint = hashString(urlPath);
  const extension = inferFileExtension(url, contentType);

  return `${namespace}/${pageId}/${imageId}-${fingerprint}${extension}`;
}

async function getAssetBaseUrl(env: Env, fallbackBaseUrl: string): Promise<string> {
  return (await getEnvValue(env, 'ASSET_PUBLIC_BASE_URL')) || fallbackBaseUrl;
}

export async function ensureStableImageUrl(
  env: Env,
  fallbackBaseUrl: string,
  namespace: string,
  pageId: string,
  image: ImageReference | null
): Promise<string | null> {
  if (!image?.url) {
    return null;
  }

  if (!isNotionHostedFile(image.url) || !env.MEDIA_BUCKET) {
    return image.url;
  }

  const objectKey = buildObjectKey(namespace, pageId, image.id, image.url);
  const existingObject = await env.MEDIA_BUCKET.head(objectKey);
  const publicBaseUrl = await getAssetBaseUrl(env, fallbackBaseUrl);

  if (existingObject) {
    return buildMediaUrl(publicBaseUrl, objectKey);
  }

  const upstream = await fetch(image.url);
  if (!upstream.ok || !upstream.body) {
    return image.url;
  }

  const contentType = upstream.headers.get('content-type');

  await env.MEDIA_BUCKET.put(objectKey, upstream.body, {
    httpMetadata: {
      contentType: contentType || undefined,
      cacheControl: IMMUTABLE_CACHE_CONTROL
    },
    customMetadata: {
      source: 'notion',
      pageId,
      imageId: image.id
    }
  });

  return buildMediaUrl(publicBaseUrl, objectKey);
}

export async function ensureStableImageUrls(
  env: Env,
  fallbackBaseUrl: string,
  namespace: string,
  pageId: string,
  images: ImageReference[]
): Promise<string[]> {
  const results = await Promise.all(
    images.map((image) =>
      ensureStableImageUrl(env, fallbackBaseUrl, namespace, pageId, image)
    )
  );

  return Array.from(new Set(results.filter(Boolean))) as string[];
}

export async function handleMediaRequest(pathname: string, env: Env): Promise<Response> {
  const key = mediaKeyFromPath(pathname);
  if (!key || !env.MEDIA_BUCKET) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object?.body) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', IMMUTABLE_CACHE_CONTROL);
  }
  if (object.httpEtag) {
    headers.set('ETag', object.httpEtag);
  }

  return new Response(object.body, {
    headers
  });
}
