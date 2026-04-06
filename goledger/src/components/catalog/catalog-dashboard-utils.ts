import type { CatalogRecord } from "@/lib/goledger";
import type { CatalogAssetCreationType } from "./catalog-create-forms";
import type { CatalogAssetOption } from "./catalog-option-utils";

type CreationOptions = {
  tvShows: CatalogAssetOption[];
  seasons: CatalogAssetOption[];
};

function isSeasonAsset(assetType: string) {
  const bucket = assetType.toLowerCase();
  return bucket.includes("season") || bucket.includes("temporad");
}

export function getCreationTypeLabel(assetType: CatalogAssetCreationType | null) {
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

export function getRecordLabel(values: Record<string, string>) {
  return values.title ?? values.number ?? values.episodeNumber ?? "registro";
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

export function buildDetailHeaderTitle(
  selectedRow: CatalogRecord | null,
  relationshipLabelByKey: Map<string, string>,
) {
  if (!selectedRow) {
    return "Registro";
  }

  if (!isSeasonAsset(selectedRow.assetType)) {
    return selectedRow.values.title ?? "Registro";
  }

  const relatedTitle = selectedRow.values.tvShowKey ? relationshipLabelByKey.get(selectedRow.values.tvShowKey) : undefined;
  const seasonNumber = selectedRow.values.number?.trim();

  if (relatedTitle && seasonNumber) {
    return `${relatedTitle} - Temporada ${seasonNumber}`;
  }

  if (relatedTitle) {
    return relatedTitle;
  }

  if (seasonNumber) {
    return `Temporada ${seasonNumber}`;
  }

  return selectedRow.values.title ?? "Registro";
}
