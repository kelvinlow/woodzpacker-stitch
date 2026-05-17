import { Env, NotionBlock } from '../types';
import { ImageReference } from './media';
import { notionFetch } from './notion';

export async function fetchBlockChildren(
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

export async function hydrateBlocks(
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

function getRawBlockImageUrl(block: NotionBlock): string | null {
  if (block.type !== 'image') {
    return null;
  }

  const content = block[block.type];
  return content?.external?.url || content?.file?.url || null;
}

export function findFirstRawImageBlock(blocks: NotionBlock[]): ImageReference | null {
  for (const block of blocks) {
    const imageUrl = getRawBlockImageUrl(block);
    if (imageUrl) {
      return {
        id: block.id,
        url: imageUrl
      };
    }

    if (Array.isArray(block.children) && block.children.length > 0) {
      const nestedImage = findFirstRawImageBlock(block.children);
      if (nestedImage) {
        return nestedImage;
      }
    }
  }

  return null;
}

export async function fetchPageBlocks(
  pageId: string,
  env: Env,
  resourceLabel: string
): Promise<NotionBlock[]> {
  const response = await notionFetch(`/v1/blocks/${pageId}/children`, env);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Failed to fetch ${resourceLabel} content (${response.status}): ${errorData}`
    );
  }

  const data = (await response.json()) as { results: NotionBlock[] };
  return hydrateBlocks(data.results, env);
}

export async function fetchFirstImageReference(
  pageId: string,
  env: Env,
  resourceLabel: string
): Promise<ImageReference | null> {
  const hydratedBlocks = await fetchPageBlocks(pageId, env, resourceLabel);
  return findFirstRawImageBlock(hydratedBlocks);
}
