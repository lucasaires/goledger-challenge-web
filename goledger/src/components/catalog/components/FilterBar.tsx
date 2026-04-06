"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/shared/ui/LoadingSpinner";
import styles from "../styles/filter-bar.module.scss";
import type { CatalogFilterValues } from "../utils/catalog-filter";

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
        {isLoading ? (
          <span className={styles.buttonLoading}>
            <LoadingSpinner size={14} label="Filtrando" />
            <span>Filtrando...</span>
          </span>
        ) : (
          "Aplicar filtros"
        )}
      </button>
    </form>
  );
}
