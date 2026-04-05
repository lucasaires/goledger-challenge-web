import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAsset, deleteAsset, searchAssets, updateAsset } from "@/lib/goledger";
import {
  buildCatalogSearchSelector,
  classifyAssetType,
  parseRecommendedAge,
  normalizeRows,
  parseSearchResult,
} from "@/lib/goledger/catalog-mappers";
import {
  buildCreatePayload,
  type CatalogAssetOption,
  type CatalogAssetCreationType,
} from "./catalog-create-forms";
import type { CatalogRecord } from "@/lib/goledger";
import type { CatalogFilterValues } from "@/components/catalog/FilterBar";

export type CatalogFormValues = Record<string, string>;

const DEFAULT_ROWS_PER_PAGE = 10;

function optionFromRecord(record: Record<string, unknown>) {
  const title = String(record.title ?? record.name ?? record.id ?? "");
  const key = String(record["@key"] ?? record.id ?? "");
  const number = String(record.number ?? "");

  if (!key) {
    return null;
  }

  if (title) {
    const label = number ? `${title} - temporada ${number} (${key})` : `${title} (${key})`;
    return { label, value: key };
  }

  if (number) {
    return { label: `Temporada ${number} (${key})`, value: key };
  }

  return { label: key, value: key };
}

export function useCatalogData() {
  const [rows, setRows] = useState<CatalogRecord[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Carregando registros da API...");
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [totalRows, setTotalRows] = useState(0);
  const [creationOptions, setCreationOptions] = useState<{
    tvShows: CatalogAssetOption[];
    seasons: CatalogAssetOption[];
  }>({
    tvShows: [],
    seasons: [],
  });
  const latestRequestId = useRef(0);

  const stats = useMemo(() => {
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
  }, [rows]);

  useEffect(() => {
    let isMounted = true;

    const loadCreationOptions = async () => {
      try {
        const [tvShowResponse, seasonResponse] = await Promise.all([
          searchAssets({ selector: { "@assetType": { $in: ["tvShows"] } }, limit: 1000 }),
          searchAssets({ selector: { "@assetType": { $in: ["seasons"] } }, limit: 1000 }),
        ]);

        if (!isMounted) {
          return;
        }

        const tvShows = parseSearchResult(tvShowResponse)
          .map(optionFromRecord)
          .filter((item): item is CatalogAssetOption => item !== null);

        const seasons = parseSearchResult(seasonResponse)
          .map(optionFromRecord)
          .filter((item): item is CatalogAssetOption => item !== null);

        setCreationOptions({ tvShows, seasons });
      } catch {
        if (!isMounted) {
          return;
        }

        setCreationOptions({ tvShows: [], seasons: [] });
      }
    };

    void loadCreationOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadAllRows = useCallback(async (filters: CatalogFilterValues) => {
    const requestId = ++latestRequestId.current;
    const selector = buildCatalogSearchSelector(filters);

    try {
      setIsFiltering(true);
      const response = await searchAssets({
        selector,
        limit: 1000,
      });

      if (requestId !== latestRequestId.current) {
        return;
      }

      const normalizedRows = normalizeRows(parseSearchResult(response));

      setRows(normalizedRows);
      setRowsPerPage(DEFAULT_ROWS_PER_PAGE);
      setTotalRows(normalizedRows.length);
      setStatusMessage(
        filters.term.trim()
          ? `${normalizedRows.length} registro(s) encontrados.`
          : `${normalizedRows.length} registro(s) carregados.`,
      );
    } catch (error) {
      if (requestId !== latestRequestId.current) {
        return;
      }

      setStatusMessage(
        error instanceof Error
          ? `Falha ao buscar registros: ${error.message}`
          : "Falha ao buscar registros na API.",
      );
      throw error;
    } finally {
      if (requestId === latestRequestId.current) {
        setIsFiltering(false);
      }
    }
  }, []);

  const handleFilter = useCallback(async (filters: CatalogFilterValues) => {
    await loadAllRows(filters);
  }, [loadAllRows]);

  const handleCreateOrUpdate = useCallback(async (
    values: CatalogFormValues,
    editingRow: CatalogRecord | null,
    createAssetType?: CatalogAssetCreationType,
  ) => {
    if (editingRow) {
      const recommendedAge = parseRecommendedAge(values.recommendedAge);

      await updateAsset({
        "@assetType": editingRow.assetType,
        title: values.title,
        description: values.description,
        recommendedAge,
      });

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === editingRow.id
            ? {
                ...row,
                cells: [values.title, "Serie", "Ativo"],
                values: {
                  ...row.values,
                  title: values.title,
                  description: values.description,
                  recommendedAge: values.recommendedAge,
                },
              }
            : row,
        ),
      );

      setStatusMessage(`Registro ${values.title} atualizado com sucesso.`);
      return { mode: "updated" as const, title: values.title };
    }

    const assetType = createAssetType ?? "tvShows";
    const payload = buildCreatePayload(assetType, values);

    await createAsset(payload);

    setRows((currentRows) => [
      {
        id: `${assetType}:${values.title ?? values.number ?? values.episodeNumber ?? Date.now()}`,
        assetType,
        cells: [
          values.title ?? values.number ?? values.episodeNumber ?? "-",
          assetType,
          "Ativo",
        ],
        values: Object.fromEntries(
          Object.entries(values).filter(([, value]) => value !== undefined),
        ) as Record<string, string>,
      },
      ...currentRows,
    ]);
    setTotalRows((currentTotalRows) => currentTotalRows + 1);

    setStatusMessage(`Registro ${values.title ?? values.number ?? values.episodeNumber} criado com sucesso na blockchain.`);
    return { mode: "created" as const, title: values.title };
  }, []);

  const handleDelete = useCallback(async (row: CatalogRecord) => {
    await deleteAsset({
      "@assetType": row.assetType,
      title: row.values.title,
    });

    setRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));
    setTotalRows((currentTotalRows) => Math.max(0, currentTotalRows - 1));
    setStatusMessage(`Registro ${row.values.title} removido com sucesso.`);
    return { title: row.values.title, id: row.id };
  }, []);

  const setEditingStatusMessage = useCallback((title: string) => {
    setStatusMessage(`Editando o registro ${title}.`);
  }, []);

  const setCreateStatusMessage = useCallback(() => {
    setStatusMessage("Preencha os campos para criar um novo registro.");
  }, []);

  return {
    rows,
    isFiltering,
    statusMessage,
    stats,
    rowsPerPage,
    totalRows,
    handleFilter,
    handleCreateOrUpdate,
    handleDelete,
    setEditingStatusMessage,
    setCreateStatusMessage,
    creationOptions,
  };
}
