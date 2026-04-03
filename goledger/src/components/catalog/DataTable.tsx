import styles from "./data-table.module.scss";
import type { CatalogRecord } from "@/lib/goledger";

type DataTableProps = {
  caption: string;
  columns: string[];
  rows: CatalogRecord[];
  onEdit?: (row: CatalogRecord) => void;
  onDelete?: (row: CatalogRecord) => void;
};

export function DataTable({ caption, columns, rows, onEdit, onDelete }: DataTableProps) {
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
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${index}`}>{cell}</td>
                ))}
                <td>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => onEdit?.(row)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => onDelete?.(row)}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
