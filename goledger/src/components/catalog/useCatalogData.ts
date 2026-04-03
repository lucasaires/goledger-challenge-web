import { useCallback, useMemo, useRef, useState } from "react";
import { createAsset, deleteAsset, searchAssets, updateAsset } from "@/lib/goledger";
import {
  classifyAssetType,
  filterRowsByTerm,
  getAssetTypesByCategory,
  normalizeRows,
  parseRecommendedAge,
  parseSearchResult,
  uniqueAssets,
} from "@/lib/goledger/catalog-mappers";
import type { CatalogRecord } from "@/lib/goledger";
import type { CatalogFilterValues } from "@/components/catalog/FilterBar";

export type CatalogFormValues = Record<string, string>;

export function useCatalogData() {
  const [rows, setRows] = useState<CatalogRecord[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Carregando registros da API...");
  const latestFilterRequest = useRef(0);

  const stats = useMemo(() => {
    let totalSeries = 0;
    let totalSeasons = 0;
    let totalEpisodes = 0;
    let activeWatchlists = 0;

    for (const row of rows) {
      const bucket = classifyAssetType(row.assetType);
      const status = (row.cells[2] ?? "").toLowerCase();

      if (bucket === "series") {
        totalSeries += 1;
      }

      if (bucket === "season") {
        totalSeasons += 1;
      }

      if (bucket === "episode") {
        totalEpisodes += 1;
      }

      if (bucket === "watchlist" && status.includes("ativo")) {
        activeWatchlists += 1;
      }
    }

    return [
      { label: "Total de series", value: totalSeries },
      { label: "Total de temporadas", value: totalSeasons },
      { label: "Total de episodios", value: totalEpisodes },
      { label: "Watchlists ativas", value: activeWatchlists },
    ];
  }, [rows]);

  const handleFilter = useCallback(async ({ term, category }: CatalogFilterValues) => {
    const requestId = ++latestFilterRequest.current;
    const typesToSearch = getAssetTypesByCategory({ term, category });

    try {
      setIsFiltering(true);

      const responses = await Promise.all(
        typesToSearch.map((assetType) =>
          searchAssets({ selector: { "@assetType": assetType } }),
        ),
      );

      if (requestId !== latestFilterRequest.current) {
        return;
      }

      const parsedAssets = uniqueAssets(
        responses.flatMap((response) => parseSearchResult(response)),
      );
      const normalizedRows = normalizeRows(parsedAssets);
      const filteredRows = filterRowsByTerm(normalizedRows, term);

      setRows(filteredRows);
      setStatusMessage(`${filteredRows.length} registro(s) encontrados.`);
    } catch (error) {
      if (requestId !== latestFilterRequest.current) {
        return;
      }

      setStatusMessage(
        error instanceof Error
          ? `Falha ao buscar registros: ${error.message}`
          : "Falha ao buscar registros na API.",
      );
      throw error;
    } finally {
      if (requestId === latestFilterRequest.current) {
        setIsFiltering(false);
      }
    }
  }, []);

  const handleCreateOrUpdate = useCallback(async (
    values: CatalogFormValues,
    editingRow: CatalogRecord | null,
  ) => {
    const recommendedAge = parseRecommendedAge(values.recommendedAge);

    if (editingRow) {
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

    await createAsset({
      "@assetType": "tvShows",
      title: values.title,
      description: values.description,
      recommendedAge,
    });

    setRows((currentRows) => [
      {
        id: `tvShows:${values.title}:${Date.now()}`,
        assetType: "tvShows",
        cells: [values.title, "Serie", "Ativo"],
        values: {
          title: values.title,
          description: values.description,
          recommendedAge: values.recommendedAge,
        },
      },
      ...currentRows,
    ]);

    setStatusMessage(`Registro ${values.title} criado com sucesso na blockchain.`);
    return { mode: "created" as const, title: values.title };
  }, []);

  const handleDelete = useCallback(async (row: CatalogRecord) => {
    await deleteAsset({
      "@assetType": row.assetType,
      title: row.values.title,
    });

    setRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));
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
    handleFilter,
    handleCreateOrUpdate,
    handleDelete,
    setEditingStatusMessage,
    setCreateStatusMessage,
  };
}
