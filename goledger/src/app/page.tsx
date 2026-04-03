import styles from "./page.module.scss";
import { StatCard, Topbar, WorkspacePanel } from "@/components/dashboard";
import { CrudForm, DataTable, FilterBar } from "@/components/catalog";

const stats = [
  { label: "Total de series", value: 0 },
  { label: "Total de temporadas", value: 0 },
  { label: "Total de episodios", value: 0 },
  { label: "Watchlists ativas", value: 0 },
];

const catalogColumns = ["Nome", "Categoria", "Status"];

const catalogRows = [
  { id: "1", cells: ["Breaking Series", "Serie", "Ativo"] },
  { id: "2", cells: ["Season One", "Temporada", "Ativo"] },
  { id: "3", cells: ["Episode Pilot", "Episodio", "Rascunho"] },
];

const formFields = [
  { label: "Titulo", name: "title", placeholder: "Digite o titulo" },
  { label: "Descricao", name: "description", placeholder: "Digite a descricao", as: "textarea" as const },
  { label: "Codigo", name: "code", placeholder: "Ex: TVS-001" },
];

export default function Home() {
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
          />

          <DataTable
            caption="Lista de registros"
            columns={catalogColumns}
            rows={catalogRows}
          />
        </section>

        <WorkspacePanel
          title="Area de trabalho"
          description="lore ipsum dolor sit amet."
        />
      </main>
    </div>
  );
}
