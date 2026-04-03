"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CrudForm, DataTable, FilterBar } from "@/components/catalog";
import { StatCard, Topbar, WorkspacePanel } from "@/components/dashboard";
import { createAsset, deleteAsset, searchAssets, updateAsset } from "@/lib/goledger";
import styles from "../../app/page.module.scss";
import type { CatalogRecord } from "@/lib/goledger";
import type { CatalogFilterValues } from "@/components/catalog/FilterBar";

const catalogColumns = ["Nome", "Categoria", "Status"];

function mapCategoryToAssetType(category: string) {
  const normalized = category.toLowerCase();

  if (normalized.includes("temporada")) {
    return "season";
  }

  if (normalized.includes("episodio")) {
    return "episode";
  }

  if (normalized.includes("watch")) {
    return "watchlist";
  }

  if (normalized.includes("series") || normalized.includes("serie")) {
    return "tvShow";
  }

  return "all";
}

function parseSearchResult(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  if (!raw || typeof raw !== "object") {
    return [];
  }

  const objectRaw = raw as Record<string, unknown>;

  if (Array.isArray(objectRaw.result)) {
    return objectRaw.result.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  if (Array.isArray(objectRaw.docs)) {
    return objectRaw.docs.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  if (Array.isArray(objectRaw.data)) {
    return objectRaw.data.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  return [];
}

function normalizeRows(assets: Record<string, unknown>[]): CatalogRecord[] {
  return assets.map((asset, index) => {
    const assetType = String(asset["@assetType"] ?? "asset");
    const title = String(asset.title ?? asset.name ?? asset.id ?? `Registro ${index + 1}`);
    const description = String(asset.description ?? "");
    const code = String(asset.id ?? asset.code ?? `${assetType}-${index + 1}`);
    const status = String(asset.status ?? "Ativo");

    return {
      id: code,
      assetType,
      cells: [title, assetType, status],
      values: {
        title,
        description,
        code,
      },
    };
  });
}

function filterRowsByTerm(items: CatalogRecord[], term: string) {
  const normalizedTerm = term.trim().toLowerCase();

  if (!normalizedTerm) {
    return items;
  }

  return items.filter((item) => {
    const searchable = [item.id, ...item.cells, ...Object.values(item.values)].join(" ").toLowerCase();
    return searchable.includes(normalizedTerm);
  });
}

function classifyAssetType(assetType: string) {
  const normalized = assetType.toLowerCase();

  if (normalized.includes("watch")) {
    return "watchlist";
  }

  if (normalized.includes("episod")) {
    return "episode";
  }

  if (normalized.includes("season") || normalized.includes("temporad")) {
    return "season";
  }

  if (normalized.includes("tvshow") || normalized.includes("series") || normalized.includes("serie")) {
    return "series";
  }

  return "other";
}

export function CatalogDashboard() {
  const [rows, setRows] = useState<CatalogRecord[]>([]);
  const [editingRow, setEditingRow] = useState<CatalogRecord | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Carregando registros da API...",
  );

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
    const assetType = mapCategoryToAssetType(category);
    const selector = assetType === "all" ? {} : { "@assetType": assetType };

    try {
      setIsFiltering(true);

      const response = await searchAssets({ selector });
      const parsedAssets = parseSearchResult(response);
      const normalizedRows = normalizeRows(parsedAssets);
      const filteredRows = filterRowsByTerm(normalizedRows, term);

      setRows(filteredRows);
      setStatusMessage(`${filteredRows.length} registro(s) encontrados.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Falha ao buscar registros: ${error.message}`
          : "Falha ao buscar registros na API.",
      );
    } finally {
      setIsFiltering(false);
    }
  }, []);

  useEffect(() => {
    void handleFilter({ term: "", category: "all" });
  }, [handleFilter]);

  const handleCreate = async (values: Record<string, string>) => {
    const payload = {
      "@assetType": "tvShow",
      id: values.code,
      title: values.title,
      description: values.description,
    };

    try {
      if (editingRow) {
        await updateAsset({
          "@assetType": editingRow.assetType,
          id: editingRow.id,
          title: values.title,
          description: values.description,
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
                  },
                }
              : row,
          ),
        );

        setStatusMessage(`Registro ${editingRow.id} atualizado com sucesso.`);
        setEditingRow(null);
        return;
      }

      await createAsset(payload);

      setRows((currentRows) => [
        {
          id: values.code,
          assetType: "tvShow",
          cells: [values.title, "Serie", "Ativo"],
          values: {
            title: values.title,
            description: values.description,
            code: values.code,
          },
        },
        ...currentRows,
      ]);

      setStatusMessage(`Registro ${values.code} criado com sucesso na blockchain.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Falha ao criar o registro: ${error.message}`
          : "Falha ao criar o registro na API.",
      );
      throw error;
    }
  };

  const handleEdit = (row: CatalogRecord) => {
    setEditingRow(row);
    setStatusMessage(`Editando o registro ${row.id}.`);
  };

  const handleDelete = async (row: CatalogRecord) => {
    try {
      await deleteAsset({
        "@assetType": row.assetType,
        id: row.id,
      });

      setRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));
      setStatusMessage(`Registro ${row.id} removido com sucesso.`);

      if (editingRow?.id === row.id) {
        setEditingRow(null);
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `Falha ao remover o registro: ${error.message}`
          : "Falha ao remover o registro na API.",
      );
    }
  };

  const formValues = editingRow?.values;
  const formLabel = editingRow ? "Atualizar" : "Salvar";
  const cancelLabel = editingRow ? "Cancelar" : "Limpar";
  const formFields = [
    { label: "Titulo", name: "title", placeholder: "Digite o titulo" },
    {
      label: "Descricao",
      name: "description",
      placeholder: "Digite a descricao",
      as: "textarea" as const,
    },
    {
      label: "Codigo",
      name: "code",
      placeholder: "Ex: TVS-001",
      readOnly: Boolean(editingRow),
    },
  ];

  return (
    <div className={styles.page}>
      <Topbar
        title="GoLedger TV Shows"
        description="Painel base para criar, editar e consultar series, temporadas e episodios."
        actionLabel="Novo registro"
      />

      <main className={styles.content}>
        <section className={styles.stats}>
          {stats.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </section>

        <FilterBar
          searchPlaceholder="Buscar por titulo, codigo ou episodio"
          categories={["Series", "Temporadas", "Episodios", "Watchlists"]}
          isLoading={isFiltering}
          onApply={handleFilter}
        />

        <section className={styles.workspaceGrid}>
          <CrudForm
            title={editingRow ? `Editando ${editingRow.id}` : "Formulario de cadastro"}
            description="Base para criar e editar assets da aplicacao a partir da API."
            fields={formFields}
            initialValues={formValues}
            submitLabel={formLabel}
            cancelLabel={cancelLabel}
            onSubmit={handleCreate}
            onCancel={() => setEditingRow(null)}
          />

          <DataTable
            caption="Lista de registros"
            columns={catalogColumns}
            rows={rows}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </section>

        <WorkspacePanel title="Area de trabalho" description={statusMessage} />
      </main>
    </div>
  );
}
