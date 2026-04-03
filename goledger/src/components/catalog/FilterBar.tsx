import styles from "./filter-bar.module.scss";

type FilterBarProps = {
  searchPlaceholder: string;
  categories: string[];
};

export function FilterBar({ searchPlaceholder, categories }: FilterBarProps) {
  return (
    <section className={styles.filterBar} aria-label="Filtros do catalogo">
      <div className={styles.searchBox}>
        <label htmlFor="catalog-search">Buscar</label>
        <input id="catalog-search" type="search" placeholder={searchPlaceholder} />
      </div>

      <div className={styles.selectBox}>
        <label htmlFor="catalog-category">Categoria</label>
        <select id="catalog-category" defaultValue="all">
          <option value="all">Todas</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <button type="button">Aplicar filtros</button>
    </section>
  );
}
