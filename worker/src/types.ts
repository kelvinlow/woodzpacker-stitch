export interface NotionProperty {
  type: string;
  [key: string]: any;
}

export interface NotionPage {
  id: string;
  properties: Record<string, NotionProperty>;
  url: string;
}

export interface NotionResponse {
  results: NotionPage[];
}

export interface NotionBlock {
  type: string;
  id: string;
  [key: string]: any;
}

export interface SecretStoreBinding {
  get(): Promise<string | undefined>;
}

export type EnvValue = string | SecretStoreBinding | undefined;

export interface ObjectStorageMetadata {
  contentType?: string;
  cacheControl?: string;
}

export interface ObjectStorageObject {
  body?: ReadableStream | null;
  httpEtag?: string;
  size?: number;
  writeHttpMetadata(headers: Headers): void;
}

export interface ObjectStorageBucket {
  get(key: string): Promise<ObjectStorageObject | null>;
  head(key: string): Promise<ObjectStorageObject | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
    options?: {
      httpMetadata?: ObjectStorageMetadata;
      customMetadata?: Record<string, string>;
    }
  ): Promise<void>;
}

export interface Env {
  NOTION_TOKEN?: EnvValue;
  ARTICLE_DATA_SOURCE_ID?: EnvValue;
  PRODUCT_DATA_SOURCE_ID?: EnvValue;
  NOTION_API_VERSION?: EnvValue;
  ASSET_PUBLIC_BASE_URL?: EnvValue;
  MEDIA_BUCKET?: ObjectStorageBucket;
}
