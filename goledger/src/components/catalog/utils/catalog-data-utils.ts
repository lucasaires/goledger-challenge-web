import { classifyAssetType } from "@/services/goledger/catalog-mappers";
import type { CatalogAssetCreationType } from "./catalog-create-forms";
import type { CatalogRecord } from "@/services/goledger";

export const DEFAULT_ROWS_PER_PAGE = 10;

export type CatalogFormValues = Record<string, string>;

export function mapAssetTypeToCreationType(assetType: string): CatalogAssetCreationType {
  const bucket = classifyAssetType(assetType);

  if (bucket === "series") {
    return "tvShows";
  }

  if (bucket === "season") {
    return "seasons";
  }

  if (bucket === "episode") {
    return "episodes";
  }

  return "watchlist";
}

export function getRecordLabel(values: CatalogFormValues) {
  return values.title ?? values.number ?? values.episodeNumber ?? "registro";
}

export function buildPageStats(rows: CatalogRecord[]) {
  let pageSeries = 0;
  let pageSeasons = 0;
  let pageEpisodes = 0;
  let pageWatchlists = 0;

  for (const row of rows) {
    const bucket = classifyAssetType(row.assetType);

    if (bucket === "series") {
      pageSeries += 1;
    }

    if (bucket === "season") {
      pageSeasons += 1;
    }

    if (bucket === "episode") {
      pageEpisodes += 1;
    }

    if (bucket === "watchlist") {
      pageWatchlists += 1;
    }
  }

  return [
    { label: "Series", value: pageSeries },
    { label: "Temporadas", value: pageSeasons },
    { label: "Episodios", value: pageEpisodes },
    { label: "Watchlists", value: pageWatchlists },
  ];
}

export function buildCreatedRow(assetType: CatalogAssetCreationType, values: CatalogFormValues) {
  return {
    id: `${assetType}:${values.title ?? values.number ?? values.episodeNumber ?? Date.now()}`,
    assetType,
    cells: [values.title ?? values.number ?? values.episodeNumber ?? "-", assetType, "Ativo"],
    values: Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Record<string, string>,
  } satisfies CatalogRecord;
}

export function buildUpdatedRows(rows: CatalogRecord[], editingRowId: string, values: CatalogFormValues) {
  return rows.map((row) =>
    row.id === editingRowId
      ? {
          ...row,
          cells: [values.title ?? values.number ?? values.episodeNumber ?? row.cells[0], row.cells[1], "Ativo"],
          values: {
            ...row.values,
            ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)),
          },
        }
      : row,
  );
}
