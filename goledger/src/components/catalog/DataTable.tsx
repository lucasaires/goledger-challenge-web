import styles from "./data-table.module.scss";

type DataTableProps = {
  caption: string;
  columns: string[];
  rows: Array<{ id: string; cells: string[] }>;
};

export function DataTable({ caption, columns, rows }: DataTableProps) {
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
                    <button type="button">Editar</button>
                    <button type="button">Excluir</button>
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
