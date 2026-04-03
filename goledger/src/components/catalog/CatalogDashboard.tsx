"use client";

import { useMemo, useState } from "react";
import { CrudForm, DataTable, FilterBar } from "@/components/catalog";
import { StatCard, Topbar, WorkspacePanel } from "@/components/dashboard";
import { createAsset } from "@/lib/goledger";
import styles from "../../app/page.module.scss";
import type { CatalogRecord } from "@/lib/goledger";

const initialStats = [
  { label: "Total de series", value: 0 },
  { label: "Total de temporadas", value: 0 },
  { label: "Total de episodios", value: 0 },
  { label: "Watchlists ativas", value: 0 },
];

const initialRows: CatalogRecord[] = [
  { id: "1", cells: ["Breaking Series", "Serie", "Ativo"] },
  { id: "2", cells: ["Season One", "Temporada", "Ativo"] },
  { id: "3", cells: ["Episode Pilot", "Episodio", "Rascunho"] },
];

const catalogColumns = ["Nome", "Categoria", "Status"];

const formFields = [
  { label: "Titulo", name: "title", placeholder: "Digite o titulo" },
  { label: "Descricao", name: "description", placeholder: "Digite a descricao", as: "textarea" as const },
  { label: "Codigo", name: "code", placeholder: "Ex: TVS-001" },
];

export function CatalogDashboard() {
  const [rows, setRows] = useState(initialRows);
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
      await createAsset(payload);

      setRows((currentRows) => [
        {
          id: values.code,
          cells: [values.title, "Serie", "Ativo"],
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
            title="Formulario de cadastro"
            description="Base para criar e editar assets da aplicacao a partir da API."
            fields={formFields}
            onSubmit={handleCreate}
          />

          <DataTable caption="Lista de registros" columns={catalogColumns} rows={rows} />
        </section>

        <WorkspacePanel title="Area de trabalho" description={statusMessage} />
      </main>
    </div>
  );
}
