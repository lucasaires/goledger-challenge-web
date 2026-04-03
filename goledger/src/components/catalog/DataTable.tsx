import { useMemo } from "react";
import ReactDataTable, { type TableColumn } from "react-data-table-component";
import styles from "./data-table.module.scss";
import type { CatalogRecord } from "@/lib/goledger";

type DataTableProps = {
  caption: string;
  columns: string[];
  rows: CatalogRecord[];
  onRowClick?: (row: CatalogRecord) => void;
  onEdit?: (row: CatalogRecord) => void;
  onDelete?: (row: CatalogRecord) => void;
};

export function DataTable({ caption, columns, rows, onRowClick, onEdit, onDelete }: DataTableProps) {
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
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(row);
              }}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(row);
              }}
            >
              Excluir
            </button>
          </div>
        ),
        width: "180px",
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
          paginationPerPage={10}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
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
