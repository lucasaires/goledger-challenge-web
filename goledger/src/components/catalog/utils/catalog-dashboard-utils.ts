import type { CatalogRecord } from "@/lib/goledger";
import type { CatalogAssetOption } from "./catalog-option-utils";

type CreationOptions = {
  tvShows: CatalogAssetOption[];
  seasons: CatalogAssetOption[];
};

function isSeasonAsset(assetType: string) {
  const bucket = assetType.toLowerCase();
  return bucket.includes("season") || bucket.includes("temporad");
}

export function getCreationTypeLabel(assetType: "tvShows" | "seasons" | "episodes" | "watchlist" | null) {
  if (!assetType) {
    return "registro";
  }

  return {
    tvShows: "Serie",
    seasons: "Temporada",
    episodes: "Episodio",
    watchlist: "Watchlist",
  }[assetType] ?? "registro";
}

export function buildTableRows(rows: CatalogRecord[], tvShows: CatalogAssetOption[]) {
  const tvShowByKey = new Map(tvShows.map((option) => [option.value, option.label]));

  return rows.map((row) => {
    if (!isSeasonAsset(row.assetType)) {
      return row;
    }

    const seasonNumber = row.values.number?.trim();
    const relatedTitle = row.values.tvShowKey ? tvShowByKey.get(row.values.tvShowKey) : undefined;

    if (!seasonNumber && !relatedTitle) {
      return row;
    }

    const seasonLabel = seasonNumber ? `Temporada ${seasonNumber}` : "Temporada";
    const nameLabel = relatedTitle ? `${relatedTitle} - ${seasonLabel}` : seasonLabel;

    return {
      ...row,
      cells: [nameLabel, row.cells[1], row.cells[2]],
    };
  });
}

export function buildRelationshipLabelByKey(options: CreationOptions) {
  const labels = new Map<string, string>();

  for (const option of options.tvShows) {
    labels.set(option.value, option.label);
  }

  for (const option of options.seasons) {
    labels.set(option.value, option.label);
  }

  return labels;
}
