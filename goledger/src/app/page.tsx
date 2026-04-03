import styles from "./page.module.scss";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <h1>GoLedger TV Shows</h1>
          <p>Painel base para criar, editar e consultar series, temporadas e episodios.</p>
        </div>
        <button type="button">Novo registro</button>
      </header>

      <main className={styles.content}>
        <section className={styles.stats}>
          <article className={styles.card}>
            <span>Total de series</span>
            <strong>0</strong>
          </article>
          <article className={styles.card}>
            <span>Total de temporadas</span>
            <strong>0</strong>
          </article>
          <article className={styles.card}>
            <span>Total de episodios</span>
            <strong>0</strong>
          </article>
          <article className={styles.card}>
            <span>Watchlists ativas</span>
            <strong>0</strong>
          </article>
        </section>

        <section className={styles.workspace}>
          <h2>Area de trabalho</h2>
          <p>
            Use este template para montar as telas de CRUD conectadas a API. A estrutura
            visual ja esta pronta para evoluir por modulo.
          </p>
        </section>
      </main>
    </div>
  );
}
