"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { CrudForm, DataTable, FilterBar } from "@/components/catalog";
import { StatCard, Topbar, WorkspacePanel } from "@/components/dashboard";
import { createAsset, deleteAsset, searchAssets, updateAsset } from "@/lib/goledger";
import styles from "../../app/page.module.scss";
import type { CatalogRecord } from "@/lib/goledger";
import type { CatalogFilterValues } from "@/components/catalog/FilterBar";

const catalogColumns = ["Nome", "Categoria", "Status"];

const assetTypeAliases = {
  all: ["tvShows", "tvShow", "seasons", "season", "episodes", "episode", "watchlists", "watchlist"],
  series: ["tvShows", "tvShow"],
  season: ["seasons", "season"],
  episode: ["episodes", "episode"],
  watchlist: ["watchlists", "watchlist"],
} as const;

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
    return "series";
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
    const uniqueKey = String(asset["@key"] ?? `${assetType}:${asset.title ?? asset.id ?? index}`);
    const title = String(asset.title ?? asset.name ?? asset.id ?? `Registro ${index + 1}`);
    const description = String(asset.description ?? "");
    const recommendedAge = String(asset.recommendedAge ?? "");
    const status = String(asset.status ?? "Ativo");

    return {
      id: uniqueKey,
      assetType,
      cells: [title, assetType, status],
      values: {
        title,
        description,
        recommendedAge,
      },
    };
  });
}

function parseRecommendedAge(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error("Idade recomendada invalida. Informe um numero maior ou igual a zero.");
  }

  return parsedValue;
}

function uniqueAssets(assets: Record<string, unknown>[]) {
  const seen = new Set<string>();

  return assets.filter((asset) => {
    const assetType = String(asset["@assetType"] ?? "asset");
    const keyValue = String(asset["@key"] ?? asset.title ?? asset.id ?? asset.code ?? "");
    const key = `${assetType}:${keyValue}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
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
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
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
    const bucket = mapCategoryToAssetType(category);
    const typesToSearch = assetTypeAliases[bucket];

    try {
      setIsFiltering(true);

      const responses = await Promise.all(
        typesToSearch.map((assetType) =>
          searchAssets({ selector: { "@assetType": assetType } }),
        ),
      );

      const parsedAssets = uniqueAssets(
        responses.flatMap((response) => parseSearchResult(response)),
      );
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
    Modal.setAppElement("body");
  }, []);

  useEffect(() => {
    void handleFilter({ term: "", category: "all" });
  }, [handleFilter]);

  const handleCreate = async (values: Record<string, string>) => {
    const recommendedAge = parseRecommendedAge(values.recommendedAge);

    const payload = {
      "@assetType": "tvShows",
      title: values.title,
      description: values.description,
      recommendedAge,
    };

    try {
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
        setIsFormModalOpen(false);
        setEditingRow(null);
        return;
      }

      await createAsset(payload);

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
      setIsFormModalOpen(false);
      setEditingRow(null);
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
    setIsFormModalOpen(true);
    setStatusMessage(`Editando o registro ${row.values.title}.`);
  };

  const handleOpenCreateModal = () => {
    setEditingRow(null);
    setIsFormModalOpen(true);
    setStatusMessage("Preencha os campos para criar um novo registro.");
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingRow(null);
  };

  const handleDelete = async (row: CatalogRecord) => {
    try {
      await deleteAsset({
        "@assetType": row.assetType,
        title: row.values.title,
      });

      setRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));
      setStatusMessage(`Registro ${row.values.title} removido com sucesso.`);

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
    {
      label: "Titulo",
      name: "title",
      placeholder: "Digite o titulo",
      readOnly: Boolean(editingRow),
    },
    {
      label: "Descricao",
      name: "description",
      placeholder: "Digite a descricao",
      as: "textarea" as const,
    },
    {
      label: "Idade recomendada",
      name: "recommendedAge",
      placeholder: "Ex: 14",
      type: "number",
    },
  ];

  return (
    <div className={styles.page}>
      <Topbar
        title="GoLedger TV Shows"
        description="Painel base para criar, editar e consultar series, temporadas e episodios."
        actionLabel="Novo registro"
        onAction={handleOpenCreateModal}
      />

      <main className={styles.content}>
        <section className={styles.stats}>
          {stats.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </section>

        <FilterBar
          searchPlaceholder="Buscar por titulo, descricao ou episodio"
          categories={["Series", "Temporadas", "Episodios", "Watchlists"]}
          isLoading={isFiltering}
          onApply={handleFilter}
        />

        <section className={styles.workspaceGrid}>
          <div className={styles.workspaceFullWidth}>
            <DataTable
              caption="Lista de registros"
              columns={catalogColumns}
              rows={rows}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </section>

        <WorkspacePanel title="Area de trabalho" description={statusMessage} />
      </main>

      <Modal
        isOpen={isFormModalOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Formulario de cadastro"
        className={styles.formModal}
        overlayClassName={styles.formModalOverlay}
      >
        <div className={styles.formModalHeader}>
          <button type="button" onClick={handleCloseModal} aria-label="Fechar formulario">
            Fechar
          </button>
        </div>

        <CrudForm
          title={editingRow ? `Editando ${editingRow.values.title}` : "Formulario de cadastro"}
          description="Base para criar e editar assets da aplicacao a partir da API."
          fields={formFields}
          initialValues={formValues}
          submitLabel={formLabel}
          cancelLabel={cancelLabel}
          onSubmit={handleCreate}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
