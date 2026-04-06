import { goledgerRequest } from "./client";
import type { AssetKey, AssetPayload, SearchQuery } from "./types";

export async function createAsset(asset: AssetPayload) {
  return goledgerRequest<{ result?: unknown }>("/invoke/createAsset", {
    method: "POST",
    body: JSON.stringify({ asset: [asset] }),
  });
}

export async function updateAsset(update: AssetPayload & Partial<AssetKey>) {
  return goledgerRequest<{ result?: unknown }>("/invoke/updateAsset", {
    method: "PUT",
    body: JSON.stringify({ update }),
  });
}

export async function deleteAsset(key: AssetKey) {
  return goledgerRequest<{ result?: unknown }>("/invoke/deleteAsset", {
    method: "DELETE",
    body: JSON.stringify({ key }),
  });
}

export async function searchAssets(query: SearchQuery) {
  return goledgerRequest<{ result?: unknown }>("/query/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}
