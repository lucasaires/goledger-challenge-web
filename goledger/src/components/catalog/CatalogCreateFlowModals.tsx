"use client";

import Modal from "react-modal";
import { X } from "lucide-react";
import { CrudForm } from "@/components/catalog";
import styles from "./catalog-shell.module.scss";
import { catalogAssetCreationOptions, type CatalogAssetCreationType } from "./catalog-create-forms";
import type { Field } from "./CrudForm";

export type CatalogCreateFlowModalsProps = {
  isCreateTypeModalOpen: boolean;
  isFormModalOpen: boolean;
  isEditingMode: boolean;
  formTitle: string;
  formDescription: string;
  fields: Field[];
  initialValues?: Record<string, string>;
  submitLabel: string;
  cancelLabel: string;
  onRequestCloseCreateTypeModal: () => void;
  onRequestCloseFormModal: () => void;
  onSelectCreateType: (assetType: CatalogAssetCreationType) => void;
  onSubmit: (values: Record<string, string>) => Promise<void> | void;
  onCancel: () => void;
};

export function CatalogCreateFlowModals({
  isCreateTypeModalOpen,
  isFormModalOpen,
  isEditingMode,
  formTitle,
  formDescription,
  fields,
  initialValues,
  submitLabel,
  cancelLabel,
  onRequestCloseCreateTypeModal,
  onRequestCloseFormModal,
  onSelectCreateType,
  onSubmit,
  onCancel,
}: CatalogCreateFlowModalsProps) {
  return (
    <>
      <Modal
        isOpen={isCreateTypeModalOpen}
        onRequestClose={onRequestCloseCreateTypeModal}
        contentLabel="Selecionar tipo de registro"
        className={styles.confirmModal}
        overlayClassName={styles.formModalOverlay}
      >
        <div className={styles.confirmModalContent}>
          <h3>Novo registro</h3>
          <p>Escolha o tipo de asset para abrir o formulario correto.</p>
          <div className={styles.selectionModalActions}>
            {catalogAssetCreationOptions.map((option) => (
              <button key={option.value} type="button" className={styles.selectionModalButton} onClick={() => onSelectCreateType(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isFormModalOpen}
        onRequestClose={onRequestCloseFormModal}
        contentLabel="Formulario de cadastro"
        className={styles.formModal}
        overlayClassName={styles.formModalOverlay}
      >
        <div className={styles.formModalHeader}>
          <button type="button" onClick={onRequestCloseFormModal} aria-label="Cancelar formulario">
            <span className={styles.actionLabel}>
              <X size={16} aria-hidden="true" />
              <span>{isEditingMode ? "Fechar" : "Cancelar"}</span>
            </span>
          </button>
        </div>

        <CrudForm
          title={formTitle}
          description={formDescription}
          fields={fields}
          initialValues={initialValues}
          submitLabel={submitLabel}
          cancelLabel={cancelLabel}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </Modal>
    </>
  );
}
