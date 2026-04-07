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
