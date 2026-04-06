import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAsset, deleteAsset, searchAssets, updateAsset } from "@/services/goledger";
import {
  buildCatalogSearchSelector,
  filterRowsByTerm,
  mapCategoryToAssetType,
  normalizeRows,
  parseSearchResult,
} from "@/services/goledger/catalog-mappers";
import { buildCreatePayload, type CatalogAssetCreationType } from "../utils/catalog-create-forms";
import { optionFromRecord, type CatalogAssetOption } from "../utils/catalog-option-utils";
import type { CatalogRecord } from "@/services/goledger";
import type { CatalogFilterValues } from "../utils/catalog-filter";
import {
  buildCreatedRow,
  buildPageStats,
  buildUpdatedRows,
  getRecordLabel,
  mapAssetTypeToCreationType,
  type CatalogFormValues,
} from "../utils/catalog-data-utils";

export function useCatalogData() {
  const [rows, setRows] = useState<CatalogRecord[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Carregando registros da API...");
  const [creationOptions, setCreationOptions] = useState<{
    tvShows: CatalogAssetOption[];
    seasons: CatalogAssetOption[];
  }>({
    tvShows: [],
    seasons: []
  });
  const latestRequestId = useRef(0);
  const lastFiltersRef = useRef<CatalogFilterValues>({ term: "", category: "all" });

  const stats = useMemo(() => buildPageStats(rows), [rows]);

  const tvShowLabelByKey = useMemo(
    () => new Map(creationOptions.tvShows.map((option) => [option.value, option.label])),
    [creationOptions.tvShows],
  );

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
    lastFiltersRef.current = filters;
    const categoryBucket = mapCategoryToAssetType(filters.category);
    const selector = categoryBucket === "season"
      ? {
          "@assetType": { $in: ["seasons", "season"] },
        }
      : buildCatalogSearchSelector(filters);

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
      const filteredRows = categoryBucket === "season"
        ? filterRowsByTerm(normalizedRows, filters.term, (item) => {
            const relatedKey = item.values.tvShowKey;
            return relatedKey ? tvShowLabelByKey.get(relatedKey) : undefined;
          })
        : normalizedRows;

      setRows(filteredRows);
      setStatusMessage(
        filters.term.trim()
          ? `${filteredRows.length} registro(s) encontrados.`
          : `${filteredRows.length} registro(s) carregados.`,
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
  }, [tvShowLabelByKey]);

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
  await loadAllRows(lastFiltersRef.current);

      const recordLabel = getRecordLabel(values);
      setStatusMessage(`Registro ${recordLabel} atualizado com sucesso.`);
      return { mode: "updated" as const, title: recordLabel };
    }

    const assetType = createAssetType ?? "tvShows";
    const payload = buildCreatePayload(assetType, values);

    await createAsset(payload);
    void loadCreationOptions();
    await loadAllRows(lastFiltersRef.current);

    setStatusMessage(`Registro ${values.title ?? values.number ?? values.episodeNumber} criado com sucesso na blockchain.`);
    return { mode: "created" as const, title: values.title };
  }, [loadCreationOptions]);

  const handleDelete = useCallback(async (row: CatalogRecord) => {
    await deleteAsset({
      "@assetType": row.assetType,
      "@key": row.id,
    });
    void loadCreationOptions();

    await loadAllRows(lastFiltersRef.current);
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
    handleFilter,
    handleCreateOrUpdate,
    handleDelete,
    setEditingStatusMessage,
    setCreateStatusMessage,
    creationOptions,
    refreshCreationOptions: loadCreationOptions,
  };
}
