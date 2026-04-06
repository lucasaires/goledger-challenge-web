"use client";

import { useCallback, useMemo } from "react";
import Modal from "react-modal";
import { X } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import styles from "./catalog-shell.module.scss";
import type { CatalogRecord } from "@/lib/goledger";

type RelationshipLabelMap = Map<string, string>;

type CatalogDetailModalProps = {
  selectedRow: CatalogRecord | null;
  relationshipLabelByKey: RelationshipLabelMap;
  detailHeaderTitle: string;
  onClose: () => void;
};

const detailLabelByKey: Record<string, string> = {
  title: "Titulo",
  description: "Descricao",
  recommendedAge: "Idade recomendada",
  number: "Numero",
  tvShowKey: "Serie",
  seasonKey: "Temporada",
  seasonNumber: "Numero da temporada",
  episodeNumber: "Numero do episodio",
  rating: "Avaliacao",
  releaseDate: "Data de lancamento",
  year: "Ano",
  tvShowsKeys: "Series",
};

function formatDetailKey(key: string) {
  if (detailLabelByKey[key]) {
    return detailLabelByKey[key];
  }

  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatDetailValue(key: string, value: string) {
  if (key === "releaseDate") {
    const parsedDate = parseISO(value);

    if (isValid(parsedDate)) {
      return format(parsedDate, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
    }
  }

  if (key === "recommendedAge") {
    return `${value} anos`;
  }

  return value;
}

export function CatalogDetailModal({
  selectedRow,
  relationshipLabelByKey,
  detailHeaderTitle,
  onClose,
}: CatalogDetailModalProps) {
  const detailEntries = useMemo(() => {
    if (!selectedRow) {
      return [] as Array<[string, string]>;
    }

    const priority = [
      "title",
      "description",
      "recommendedAge",
      "number",
      "seasonNumber",
      "episodeNumber",
      "rating",
      "releaseDate",
      "year",
    ];

    const entries = Object.entries(selectedRow.values)
      .filter(([, value]) => value.trim().length > 0)
      .filter(([key]) => key !== "tvShows")
      .sort(([leftKey], [rightKey]) => {
        const leftIndex = priority.indexOf(leftKey);
        const rightIndex = priority.indexOf(rightKey);

        if (leftIndex === -1 && rightIndex === -1) {
          return leftKey.localeCompare(rightKey);
        }

        if (leftIndex === -1) {
          return 1;
        }

        if (rightIndex === -1) {
          return -1;
        }

        return leftIndex - rightIndex;
      });

    const watchlistSeries = selectedRow.values.tvShowsKeys?.trim();

    if (watchlistSeries) {
      const seriesLabel = watchlistSeries
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => relationshipLabelByKey.get(item) ?? item)
        .join(", ");

      const filteredEntries = entries.filter(([key]) => key !== "tvShowsKeys");
      return [["tvShowsKeys", seriesLabel], ...filteredEntries];
    }

    return entries;
  }, [relationshipLabelByKey, selectedRow]);

  const formatEntryValue = useCallback((key: string, value: string) => {
    if (key === "title" && selectedRow && (selectedRow.assetType.toLowerCase().includes("season") || selectedRow.assetType.toLowerCase().includes("temporad"))) {
      return detailHeaderTitle;
    }

    if (key === "tvShowKey" || key === "seasonKey") {
      return relationshipLabelByKey.get(value) ?? value;
    }

    if (key === "tvShowsKeys") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => relationshipLabelByKey.get(item) ?? item)
        .join(", ");
    }

    return formatDetailValue(key, value);
  }, [detailHeaderTitle, relationshipLabelByKey, selectedRow]);

  const meta = useMemo(() => {
    if (!selectedRow) {
      return [] as string[];
    }

    const isSeason = selectedRow.assetType.toLowerCase().includes("season") || selectedRow.assetType.toLowerCase().includes("temporad");

    if (isSeason) {
      return [
        selectedRow.values.tvShowKey ? relationshipLabelByKey.get(selectedRow.values.tvShowKey) ?? "Serie" : "Serie",
        selectedRow.values.number ? `Temporada ${selectedRow.values.number}` : "Temporada",
        selectedRow.cells[2] ?? "-",
      ];
    }

    return [selectedRow.assetType ?? "-", selectedRow.cells[2] ?? "-"];
  }, [relationshipLabelByKey, selectedRow]);

  return (
    <Modal
      isOpen={Boolean(selectedRow)}
      onRequestClose={onClose}
      contentLabel="Detalhes do registro"
      className={styles.detailsModal}
      overlayClassName={styles.formModalOverlay}
    >
      <div className={styles.detailsModalHeader}>
        <h3>Detalhes do registro</h3>
        <button type="button" onClick={onClose} aria-label="Fechar detalhes">
          <span className={styles.actionLabel}>
            <X size={16} aria-hidden="true" />
            <span>Fechar</span>
          </span>
        </button>
      </div>

      <section className={styles.detailsHighlight}>
        <h4>{detailHeaderTitle}</h4>
        <div className={styles.detailsMeta}>
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <p className={styles.detailsSectionTitle}>Informacoes do item</p>

      <dl className={styles.detailsGrid}>
        {detailEntries.map(([key, value]) => (
          <div key={key} className={key === "description" ? styles.detailsDescription : undefined}>
            <dt>{formatDetailKey(key)}</dt>
            <dd>{formatEntryValue(key, value)}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
