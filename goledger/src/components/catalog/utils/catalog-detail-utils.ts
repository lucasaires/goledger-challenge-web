import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CatalogRecord } from "@/lib/goledger";

const detailLabelByKey: Record<string, string> = {
  title: "Titulo",
  description: "Descricao",
  recommendedAge: "Idade recomendada",
  number: "Numero",
  tvShowKey: "Serie",
  seasonKey: "Temporada",
  seasonNumber: "Numero da temporada",
  episodeNumber: "Numero do episodio",
  rating: "Avaliacao",
  releaseDate: "Data de lancamento",
  year: "Ano",
  tvShowsKeys: "Series",
};

function isSeasonAsset(assetType: string) {
  const normalized = assetType.toLowerCase();
  return normalized.includes("season") || normalized.includes("temporad");
}

export function formatDetailKey(key: string) {
  if (detailLabelByKey[key]) {
    return detailLabelByKey[key];
  }

  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

export function formatDetailValue(key: string, value: string) {
  if (key === "releaseDate") {
    const parsedDate = parseISO(value);

    if (isValid(parsedDate)) {
      return format(parsedDate, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
    }
  }

  if (key === "recommendedAge") {
    return `${value} anos`;
  }

  return value;
}

export function buildDetailEntries(
  selectedRow: CatalogRecord,
  relationshipLabelByKey: Map<string, string>,
) {
  const priority = ["title", "description", "recommendedAge", "number", "seasonNumber", "episodeNumber", "rating", "releaseDate", "year"];

  const entries = Object.entries(selectedRow.values)
    .filter(([, value]) => value.trim().length > 0)
    .filter(([key]) => key !== "tvShows")
    .sort(([leftKey], [rightKey]) => {
      const leftIndex = priority.indexOf(leftKey);
      const rightIndex = priority.indexOf(rightKey);

      if (leftIndex === -1 && rightIndex === -1) {
        return leftKey.localeCompare(rightKey);
      }

      if (leftIndex === -1) {
        return 1;
      }

      if (rightIndex === -1) {
        return -1;
      }

      return leftIndex - rightIndex;
    });

  const watchlistSeries = selectedRow.values.tvShowsKeys?.trim();

  if (watchlistSeries) {
    const seriesLabel = watchlistSeries
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => relationshipLabelByKey.get(item) ?? item)
      .join(", ");

    const filteredEntries = entries.filter(([key]) => key !== "tvShowsKeys");
    return [["tvShowsKeys", seriesLabel], ...filteredEntries] as Array<[string, string]>;
  }

  return entries as Array<[string, string]>;
}

export function buildDetailMeta(selectedRow: CatalogRecord, relationshipLabelByKey: Map<string, string>) {
  if (isSeasonAsset(selectedRow.assetType)) {
    return [
      selectedRow.values.tvShowKey ? relationshipLabelByKey.get(selectedRow.values.tvShowKey) ?? "Serie" : "Serie",
      selectedRow.values.number ? `Temporada ${selectedRow.values.number}` : "Temporada",
      selectedRow.cells[2] ?? "-",
    ];
  }

  return [selectedRow.assetType ?? "-", selectedRow.cells[2] ?? "-"];
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
