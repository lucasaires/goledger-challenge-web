export type AssetPayload = Record<string, unknown> & {
  "@assetType": string;
};

export type AssetKey = {
  "@assetType": string;
  id: string;
};

export type SearchQuery = {
  selector: Record<string, unknown>;
  limit?: number;
  bookmark?: string;
};

export type CatalogRecord = {
  id: string;
  assetType: string;
  cells: string[];
  values: Record<string, string>;
};
