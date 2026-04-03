import type { CatalogFilterValues } from "@/components/catalog/FilterBar";
import type { CatalogRecord } from "./types";

export const assetTypeAliases = {
  all: ["tvShows", "tvShow", "seasons", "season", "episodes", "episode", "watchlists", "watchlist"],
  series: ["tvShows", "tvShow"],
  season: ["seasons", "season"],
  episode: ["episodes", "episode"],
  watchlist: ["watchlists", "watchlist"],
} as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mapCategoryToAssetType(category: string) {
  const normalized = category.toLowerCase();

  if (normalized.includes("temporada")) {
    return "season";
  }

  if (normalized.includes("episodio")) {
    return "episode";
  }

  if (normalized.includes("watch")) {
    return "watchlist";
  }

  if (normalized.includes("series") || normalized.includes("serie")) {
    return "series";
  }

  return "all";
}

export function parseSearchResult(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  if (!raw || typeof raw !== "object") {
    return [];
  }

  const objectRaw = raw as Record<string, unknown>;

  if (Array.isArray(objectRaw.result)) {
    return objectRaw.result.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  if (Array.isArray(objectRaw.docs)) {
    return objectRaw.docs.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  if (Array.isArray(objectRaw.data)) {
    return objectRaw.data.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  return [];
}

export function normalizeRows(assets: Record<string, unknown>[]): CatalogRecord[] {
  return assets.map((asset, index) => {
    const assetType = String(asset["@assetType"] ?? "asset");
    const uniqueKey = String(asset["@key"] ?? `${assetType}:${asset.title ?? asset.id ?? index}`);
    const title = String(asset.title ?? asset.name ?? asset.id ?? `Registro ${index + 1}`);
    const description = String(asset.description ?? "");
    const recommendedAge = String(asset.recommendedAge ?? "");
    const status = String(asset.status ?? "Ativo");

    return {
      id: uniqueKey,
      assetType,
      cells: [title, assetType, status],
      values: {
        title,
        description,
        recommendedAge,
      },
    };
  });
}

export function parseRecommendedAge(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error("Idade recomendada invalida. Informe um numero maior ou igual a zero.");
  }

  return parsedValue;
}

export function uniqueAssets(assets: Record<string, unknown>[]) {
  const seen = new Set<string>();

  return assets.filter((asset) => {
    const assetType = String(asset["@assetType"] ?? "asset");
    const keyValue = String(asset["@key"] ?? asset.title ?? asset.id ?? asset.code ?? "");
    const key = `${assetType}:${keyValue}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function filterRowsByTerm(items: CatalogRecord[], term: string) {
  const normalizedTerm = term.trim().toLowerCase();

  if (!normalizedTerm) {
    return items;
  }

  return items.filter((item) => {
    const searchable = [item.id, ...item.cells, ...Object.values(item.values)].join(" ").toLowerCase();
    return searchable.includes(normalizedTerm);
  });
}

export function classifyAssetType(assetType: string) {
  const normalized = assetType.toLowerCase();

  if (normalized.includes("watch")) {
    return "watchlist";
  }

  if (normalized.includes("episod")) {
    return "episode";
  }

  if (normalized.includes("season") || normalized.includes("temporad")) {
    return "season";
  }

  if (normalized.includes("tvshow") || normalized.includes("series") || normalized.includes("serie")) {
    return "series";
  }

  return "other";
}

export function getAssetTypesByCategory(filters: CatalogFilterValues) {
  const bucket = mapCategoryToAssetType(filters.category);
  return assetTypeAliases[bucket];
}

export function buildCatalogSearchSelector(filters: CatalogFilterValues) {
  const types = getAssetTypesByCategory(filters);
  const normalizedTerm = filters.term.trim();

  if (!normalizedTerm) {
    return {
      "@assetType": { $in: types },
    };
  }

  const regex = `(?i).*${escapeRegExp(normalizedTerm)}.*`;

  return {
    $and: [
      {
        "@assetType": { $in: types },
      },
      {
        $or: [
          { title: { $regex: regex } },
          { description: { $regex: regex } },
        ],
      },
    ],
  };
}
