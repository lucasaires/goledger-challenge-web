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

type SearchResponse = {
  metadata?: {
    bookmark?: string;
    fetched_records_count?: number;
  } | null;
  result?: unknown;
};

const DEFAULT_FILTERS: CatalogFilterValues = {
  term: "",
  category: "all",
};

const DEFAULT_ROWS_PER_PAGE = 10;

function parseSearchMetadata(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return { bookmark: "", fetchedRecordsCount: 0 };
  }

  const metadata = (raw as SearchResponse).metadata;

  if (!metadata) {
    return { bookmark: "", fetchedRecordsCount: 0 };
  }

  return {
    bookmark: metadata.bookmark ?? "",
    fetchedRecordsCount: metadata.fetched_records_count ?? 0,
  };
}

function optionFromRecord(record: Record<string, unknown>) {
  const label = String(record.title ?? record.name ?? record.id ?? "");
  const value = String(record["@key"] ?? record.id ?? "");

  return label && value ? { label, value } : null;
}

export function useCatalogData() {
  const [rows, setRows] = useState<CatalogRecord[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Carregando registros da API...");
  const [activeFilters, setActiveFilters] = useState<CatalogFilterValues>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
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
  const pageBookmarksRef = useRef<Record<number, string>>({ 1: "" });

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
      { label: "Series na pagina", value: pageSeries },
      { label: "Temporadas na pagina", value: pageSeasons },
      { label: "Episodios na pagina", value: pageEpisodes },
      { label: "Watchlists na pagina", value: pageWatchlists },
    ];
  }, [rows]);

  const loadCreationOptions = useCallback(async () => {
    try {
      const [tvShowResponse, seasonResponse] = await Promise.all([
        searchAssets({ selector: { "@assetType": { $in: ["tvShows"] } }, limit: 200 }),
        searchAssets({ selector: { "@assetType": { $in: ["seasons"] } }, limit: 200 }),
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

  const loadPage = useCallback(async (
    page: number,
    pageSize: number,
    filters: CatalogFilterValues,
    resetBookmarks = false,
  ) => {
    const requestId = ++latestRequestId.current;
    const normalizedPage = Math.max(1, page);

    if (resetBookmarks) {
      pageBookmarksRef.current = { 1: "" };
    }

    pageBookmarksRef.current[1] = pageBookmarksRef.current[1] ?? "";

    const selector = buildCatalogSearchSelector(filters);
    const knownPages = Object.keys(pageBookmarksRef.current)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0 && value < normalizedPage)
      .sort((left, right) => left - right);

    let bookmark = pageBookmarksRef.current[knownPages[knownPages.length - 1] ?? 1] ?? "";
    const startPage = knownPages[knownPages.length - 1] ?? 1;

    try {
      setIsFiltering(true);

      for (let current = startPage; current < normalizedPage; current += 1) {
        const intermediateResponse = await searchAssets({
          selector,
          limit: pageSize,
          bookmark,
        });

        if (requestId !== latestRequestId.current) {
          return;
        }

        const intermediateMetadata = parseSearchMetadata(intermediateResponse);
        pageBookmarksRef.current[current + 1] = intermediateMetadata.bookmark;
        bookmark = intermediateMetadata.bookmark;
      }

      const response = await searchAssets({
        selector,
        limit: pageSize,
        bookmark: pageBookmarksRef.current[normalizedPage] ?? bookmark,
      });

      if (requestId !== latestRequestId.current) {
        return;
      }

      const metadata = parseSearchMetadata(response);
      const normalizedRows = normalizeRows(parseSearchResult(response));

      pageBookmarksRef.current[normalizedPage + 1] = metadata.bookmark;
      setRows(normalizedRows);
      setActiveFilters(filters);
      setCurrentPage(normalizedPage);
      setRowsPerPage(pageSize);
      setTotalRows((normalizedPage - 1) * pageSize + normalizedRows.length + (metadata.bookmark ? 1 : 0));
      setStatusMessage(
        filters.term.trim()
          ? `Pagina ${normalizedPage}: ${normalizedRows.length} registro(s) encontrados.`
          : `Pagina ${normalizedPage}: ${normalizedRows.length} registro(s) carregados.`,
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
    await loadPage(1, rowsPerPage, filters, true);
  }, [loadPage, rowsPerPage]);

  const handlePageChange = useCallback(async (page: number) => {
    await loadPage(page, rowsPerPage, activeFilters);
  }, [activeFilters, loadPage, rowsPerPage]);

  const handleRowsPerPageChange = useCallback(async (nextRowsPerPage: number) => {
    await loadPage(1, nextRowsPerPage, activeFilters, true);
  }, [activeFilters, loadPage]);

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
    currentPage,
    rowsPerPage,
    totalRows,
    handleFilter,
    handlePageChange,
    handleRowsPerPageChange,
    handleCreateOrUpdate,
    handleDelete,
    setEditingStatusMessage,
    setCreateStatusMessage,
    creationOptions,
  };
}
