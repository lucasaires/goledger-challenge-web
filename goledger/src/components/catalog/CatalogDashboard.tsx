"use client";

import { useMemo, useState } from "react";
import { CrudForm, DataTable, FilterBar } from "@/components/catalog";
import { StatCard, Topbar, WorkspacePanel } from "@/components/dashboard";
import { createAsset, deleteAsset, updateAsset } from "@/lib/goledger";
import styles from "../../app/page.module.scss";
import type { CatalogRecord } from "@/lib/goledger";

const initialStats = [
  { label: "Total de series", value: 0 },
  { label: "Total de temporadas", value: 0 },
  { label: "Total de episodios", value: 0 },
  { label: "Watchlists ativas", value: 0 },
];

const initialRows: CatalogRecord[] = [
  {
    id: "TVS-001",
    assetType: "tvShow",
    cells: ["Breaking Series", "Serie", "Ativo"],
    values: {
      title: "Breaking Series",
      description: "Serie de exemplo para o template.",
      code: "TVS-001",
    },
  },
  {
    id: "TVS-002",
    assetType: "tvShow",
    cells: ["Season One", "Temporada", "Ativo"],
    values: {
      title: "Season One",
      description: "Temporada de exemplo para o template.",
      code: "TVS-002",
    },
  },
  {
    id: "TVS-003",
    assetType: "tvShow",
    cells: ["Episode Pilot", "Episodio", "Rascunho"],
    values: {
      title: "Episode Pilot",
      description: "Episodio de exemplo para o template.",
      code: "TVS-003",
    },
  },
];

const catalogColumns = ["Nome", "Categoria", "Status"];

export function CatalogDashboard() {
  const [rows, setRows] = useState(initialRows);
  const [editingRow, setEditingRow] = useState<CatalogRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Conecte a API para criar registros reais a partir do formulario.",
  );

  const stats = useMemo(() => initialStats, []);

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
