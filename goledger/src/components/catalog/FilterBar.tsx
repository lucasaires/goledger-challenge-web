"use client";

import { useState } from "react";
import styles from "./filter-bar.module.scss";

export type CatalogFilterValues = {
  term: string;
  category: string;
};

type FilterBarProps = {
  searchPlaceholder: string;
  categories: string[];
  isLoading?: boolean;
  onApply?: (filters: CatalogFilterValues) => void | Promise<void>;
};

export function FilterBar({ searchPlaceholder, categories, isLoading = false, onApply }: FilterBarProps) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("all");

  return (
    <form
      className={styles.filterBar}
      aria-label="Filtros do catalogo"
      onSubmit={async (event) => {
        event.preventDefault();
        await onApply?.({ term, category });
      }}
    >
      <div className={styles.searchBox}>
        <label htmlFor="catalog-search">Buscar</label>
        <input
          id="catalog-search"
          type="search"
          placeholder={searchPlaceholder}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      <div className={styles.selectBox}>
        <label htmlFor="catalog-category">Categoria</label>
        <select
          id="catalog-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Todas</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Filtrando..." : "Aplicar filtros"}
      </button>
    </form>
  );
}
