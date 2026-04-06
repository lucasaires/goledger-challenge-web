import { useMemo } from "react";
import ReactDataTable, { type TableColumn } from "react-data-table-component";
import { Edit3, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/ui/LoadingSpinner";
import styles from "../styles/data-table.module.scss";
import type { CatalogRecord } from "@/services/goledger";

type DataTableProps = {
  caption: string;
  columns: string[];
  rows: CatalogRecord[];
  rowsPerPage?: number;
  isLoading?: boolean;
  onRowClick?: (row: CatalogRecord) => void;
  onEdit?: (row: CatalogRecord) => void;
  onDelete?: (row: CatalogRecord) => void;
};

export function DataTable({
  caption,
  columns,
  rows,
  rowsPerPage,
  isLoading = false,
  onRowClick,
  onEdit,
  onDelete,
}: DataTableProps) {
  const tableColumns = useMemo<TableColumn<CatalogRecord>[]>(
    () => [
      ...columns.map((column, index) => ({
        name: column,
        selector: (row: CatalogRecord) => row.cells[index] ?? "-",
        sortable: true,
        grow: index === 0 ? 2 : 1,
      })),
      {
        name: "Acoes",
        cell: (row: CatalogRecord) => (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionButton}
              title="Editar"
              aria-label={`Editar registro ${row.values.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(row);
              }}
            >
              <Edit3 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.actionButton}
              title="Excluir"
              aria-label={`Excluir registro ${row.values.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(row);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ),
        width: "112px",
      },
    ],
    [columns, onDelete, onEdit],
  );

  return (
    <section className={styles.tableCard} aria-label={caption}>
      <div className={styles.header}>
        <div>
          <h2>{caption}</h2>
          <p>Visualizacao inicial dos registros carregados da API.</p>
        </div>
        <span>{rows.length} itens</span>
      </div>

      <div className={styles.tableWrap}>
        <ReactDataTable
          columns={tableColumns}
          data={rows}
          keyField="id"
          pagination
          paginationPerPage={rowsPerPage ?? 10}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
          progressPending={isLoading}
          progressComponent={
            <div className={styles.loadingState} role="status" aria-live="polite">
              <LoadingSpinner size={18} label="Carregando registros" />
              <span>Carregando registros...</span>
            </div>
          }
          onRowClicked={onRowClick}
          highlightOnHover
          pointerOnHover
          responsive
          noDataComponent="Nenhum registro encontrado."
        />
      </div>
    </section>
  );
}
