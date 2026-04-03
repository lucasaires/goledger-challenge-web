import type { Field } from "./CrudForm";

export type CatalogAssetCreationType = "tvShows" | "seasons" | "episodes" | "watchlist";

export type CatalogAssetOption = {
  label: string;
  value: string;
};

export const catalogAssetCreationOptions: Array<{ label: string; value: CatalogAssetCreationType }> = [
  { label: "Serie", value: "tvShows" },
  { label: "Temporada", value: "seasons" },
  { label: "Episodio", value: "episodes" },
  { label: "Watchlist", value: "watchlist" },
];

function optionFromRecord(record: Record<string, unknown>) {
  const title = String(record.title ?? record.name ?? record.id ?? "");
  const key = String(record["@key"] ?? record.id ?? "");

  return title && key ? { label: title, value: key } : null;
}

export function buildCreateFields(
  assetType: CatalogAssetCreationType,
  options: {
    tvShows: CatalogAssetOption[];
    seasons: CatalogAssetOption[];
  },
): Field[] {
  if (assetType === "tvShows") {
    return [
      { label: "Titulo", name: "title", placeholder: "Digite o titulo" },
      { label: "Descricao", name: "description", placeholder: "Digite a descricao", as: "textarea" },
      { label: "Idade recomendada", name: "recommendedAge", placeholder: "Ex: 14", type: "number" },
    ];
  }

  if (assetType === "seasons") {
    return [
      { label: "Numero", name: "number", placeholder: "Ex: 1", type: "number" },
      {
        label: "Serie",
        name: "tvShowKey",
        placeholder: "Selecione a serie",
        as: options.tvShows.length > 0 ? "select" : "input",
        options: options.tvShows,
      },
      { label: "Ano de lancamento", name: "year", placeholder: "Ex: 2024", type: "number" },
    ];
  }

  if (assetType === "episodes") {
    return [
      {
        label: "Temporada",
        name: "seasonKey",
        placeholder: "Selecione a temporada",
        as: options.seasons.length > 0 ? "select" : "input",
        options: options.seasons,
      },
      { label: "Numero do episodio", name: "episodeNumber", placeholder: "Ex: 1", type: "number" },
      { label: "Titulo", name: "title", placeholder: "Digite o titulo" },
      { label: "Data de lancamento", name: "releaseDate", placeholder: "2026-04-03T20:30:00Z", type: "datetime-local" },
      { label: "Descricao", name: "description", placeholder: "Digite a descricao", as: "textarea" },
      { label: "Avaliacao", name: "rating", placeholder: "Ex: 8.5", type: "number", required: false },
    ];
  }

  return [
    { label: "Titulo", name: "title", placeholder: "Digite o titulo" },
    { label: "Descricao", name: "description", placeholder: "Digite a descricao", as: "textarea", required: false },
    {
      label: "Series",
      name: "tvShowsKeys",
      placeholder: "Informe os IDs das series separados por virgula",
      as: "textarea",
      required: false,
    },
  ];
}

export function buildCreatePayload(assetType: CatalogAssetCreationType, values: Record<string, string>) {
  if (assetType === "tvShows") {
    return {
      "@assetType": "tvShows",
      title: values.title,
      description: values.description,
      recommendedAge: Number(values.recommendedAge),
    };
  }

  if (assetType === "seasons") {
    return {
      "@assetType": "seasons",
      number: Number(values.number),
      tvShow: {
        "@assetType": "tvShows",
        "@key": values.tvShowKey,
      },
      year: Number(values.year),
    };
  }

  if (assetType === "episodes") {
    return {
      "@assetType": "episodes",
      season: {
        "@assetType": "seasons",
        "@key": values.seasonKey,
      },
      episodeNumber: Number(values.episodeNumber),
      title: values.title,
      releaseDate: values.releaseDate,
      description: values.description,
      rating: values.rating ? Number(values.rating) : undefined,
    };
  }

  const tvShowsKeys = values.tvShowsKeys
    ? values.tvShowsKeys.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  return {
    "@assetType": "watchlist",
    title: values.title,
    description: values.description,
    tvShows: tvShowsKeys.map((key) => ({
      "@assetType": "tvShows",
      "@key": key,
    })),
  };
}

export function extractCreationOptionsFromRows(rows: Array<Record<string, unknown>>) {
  const tvShows = rows
    .filter((row) => String(row["@assetType"] ?? "") === "tvShows")
    .map(optionFromRecord)
    .filter((item): item is CatalogAssetOption => item !== null);

  const seasons = rows
    .filter((row) => String(row["@assetType"] ?? "") === "seasons")
    .map(optionFromRecord)
    .filter((item): item is CatalogAssetOption => item !== null);

  return { tvShows, seasons };
}
