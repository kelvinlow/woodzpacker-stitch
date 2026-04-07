export interface Env {
  NOTION_TOKEN: string;
  ARTICLE_DATA_SOURCE_ID: string;
  PRODUCT_DATA_SOURCE_ID: string;
  NOTION_API_VERSION: string;
}

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
