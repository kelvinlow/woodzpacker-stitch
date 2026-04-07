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

export interface Env {
  NOTION_TOKEN?: EnvValue;
  ARTICLE_DATA_SOURCE_ID?: EnvValue;
  PRODUCT_DATA_SOURCE_ID?: EnvValue;
  NOTION_API_VERSION?: EnvValue;
}
