import { useMemo } from "react";
import ReactDataTable, { type TableColumn } from "react-data-table-component";
import { Edit3, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import styles from "./data-table.module.scss";
import type { CatalogRecord } from "@/lib/goledger";

type DataTableProps = {
  caption: string;
  columns: string[];
  rows: CatalogRecord[];
  totalRows?: number;
  currentPage?: number;
  rowsPerPage?: number;
  isLoading?: boolean;
  useServerPagination?: boolean;
  onPageChange?: (page: number) => void | Promise<void>;
  onRowsPerPageChange?: (newRowsPerPage: number, currentPage: number) => void | Promise<void>;
  onRowClick?: (row: CatalogRecord) => void;
  onEdit?: (row: CatalogRecord) => void;
  onDelete?: (row: CatalogRecord) => void;
};

export function DataTable({
  caption,
  columns,
  rows,
  totalRows,
  currentPage,
  rowsPerPage,
  isLoading = false,
  useServerPagination = false,
  onPageChange,
  onRowsPerPageChange,
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
          paginationServer={useServerPagination}
          paginationTotalRows={totalRows}
          paginationDefaultPage={currentPage}
          paginationPerPage={rowsPerPage ?? 10}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
          onChangePage={onPageChange}
          onChangeRowsPerPage={onRowsPerPageChange}
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
