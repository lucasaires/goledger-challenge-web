import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAsset, deleteAsset, searchAssets, updateAsset } from "@/lib/goledger";
import {
  buildCatalogSearchSelector,
  classifyAssetType,
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

function mapAssetTypeToCreationType(assetType: string): CatalogAssetCreationType {
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

function getRecordLabel(values: CatalogFormValues) {
  return values.title ?? values.number ?? values.episodeNumber ?? "registro";
}

function optionFromRecord(record: Record<string, unknown>) {
  const title = String(record.title ?? record.name ?? record.id ?? "");
  const key = String(record["@key"] ?? record.key ?? record.title ?? record.id ?? record.number ?? "");
  const number = String(record.number ?? "");

  if (!key) {
    return null;
  }

  if (title) {
    const label = number ? `${title} - temporada ${number}` : title;
    return { label, value: key };
  }

  if (number) {
    return { label: `Temporada ${number}`, value: key };
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

  const loadCreationOptions = useCallback(async () => {
    try {
      const [tvShowResponse, seasonResponse] = await Promise.all([
        searchAssets({ selector: { "@assetType": { $in: ["tvShows", "tvShow"] } }, limit: 1000 }),
        searchAssets({ selector: { "@assetType": { $in: ["seasons", "season"] } }, limit: 1000 }),
      ]);

      const tvShows = parseSearchResult(tvShowResponse)
        .map(optionFromRecord)
        .filter((item): item is CatalogAssetOption => item !== null);

      const seasons = parseSearchResult(seasonResponse)
        .map(optionFromRecord)
        .filter((item): item is CatalogAssetOption => item !== null);

      setCreationOptions({ tvShows, seasons });
    } catch {
      setCreationOptions({ tvShows: [], seasons: [] });
    }
  }, []);

  useEffect(() => {
    void loadCreationOptions();
  }, [loadCreationOptions]);

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
      const editingAssetType = mapAssetTypeToCreationType(editingRow.assetType);
      const updatePayload = {
        ...buildCreatePayload(editingAssetType, values),
        "@key": editingRow.id,
      };

      await updateAsset(updatePayload);

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === editingRow.id
            ? {
                ...row,
                cells: [
                  values.title ?? values.number ?? values.episodeNumber ?? row.cells[0],
                  row.cells[1],
                  "Ativo",
                ],
                values: {
                  ...row.values,
                  ...Object.fromEntries(
                    Object.entries(values).filter(([, value]) => value !== undefined),
                  ),
                },
              }
            : row,
        ),
      );

      const recordLabel = getRecordLabel(values);
      setStatusMessage(`Registro ${recordLabel} atualizado com sucesso.`);
      return { mode: "updated" as const, title: recordLabel };
    }

    const assetType = createAssetType ?? "tvShows";
    const payload = buildCreatePayload(assetType, values);

    await createAsset(payload);
    void loadCreationOptions();

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
  }, [loadCreationOptions]);

  const handleDelete = useCallback(async (row: CatalogRecord) => {
    await deleteAsset({
      "@assetType": row.assetType,
      title: row.values.title,
    });
    void loadCreationOptions();

    setRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));
    setTotalRows((currentTotalRows) => Math.max(0, currentTotalRows - 1));
    setStatusMessage(`Registro ${row.values.title} removido com sucesso.`);
    return { title: row.values.title, id: row.id };
  }, [loadCreationOptions]);

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
    refreshCreationOptions: loadCreationOptions,
  };
}
