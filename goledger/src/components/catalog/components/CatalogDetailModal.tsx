"use client";

import { useCallback, useMemo } from "react";
import Modal from "react-modal";
import { X } from "lucide-react";
import styles from "../styles/catalog-shell.module.scss";
import type { CatalogRecord } from "@/services/goledger";
import {
  buildDetailEntries,
  buildDetailHeaderTitle,
  buildDetailMeta,
  formatDetailKey,
  formatDetailValue,
} from "../utils/catalog-detail-utils";

type CatalogDetailModalProps = {
  selectedRow: CatalogRecord | null;
  relationshipLabelByKey: Map<string, string>;
  onClose: () => void;
};

export function CatalogDetailModal({
  selectedRow,
  relationshipLabelByKey,
  onClose,
}: CatalogDetailModalProps) {
  const detailHeaderTitle = useMemo(
    () => buildDetailHeaderTitle(selectedRow, relationshipLabelByKey),
    [relationshipLabelByKey, selectedRow],
  );

  const detailEntries = useMemo(() => {
    if (!selectedRow) {
      return [] as Array<[string, string]>;
    }

    return buildDetailEntries(selectedRow, relationshipLabelByKey);
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

    return buildDetailMeta(selectedRow, relationshipLabelByKey);
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
