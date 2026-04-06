"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import { Ban } from "lucide-react";
import { DataTable, FilterBar } from "@/components/catalog";
import { StatCard, Topbar, WorkspacePanel } from "@/components/dashboard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import styles from "./catalog-shell.module.scss";
import type { CatalogRecord } from "@/lib/goledger";
import { useCatalogData } from "./useCatalogData";
import { CatalogCreateFlowModals } from "./CatalogCreateFlowModals";
import { CatalogDetailModal } from "./CatalogDetailModal";
import {
  buildCreateFields,
  catalogAssetCreationOptions,
  type CatalogAssetCreationType,
} from "./catalog-create-forms";

const catalogColumns = ["Nome", "Categoria", "Status"];

function getCreationTypeLabel(assetType: CatalogAssetCreationType | null) {
  if (!assetType) {
    return "registro";
  }

  return catalogAssetCreationOptions.find((option) => option.value === assetType)?.label ?? "registro";
}

function getRecordLabel(values: Record<string, string>) {
  return values.title ?? values.number ?? values.episodeNumber ?? "registro";
}

export function CatalogDashboard() {
  const [editingRow, setEditingRow] = useState<CatalogRecord | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  const [createAssetType, setCreateAssetType] = useState<CatalogAssetCreationType | null>(null);
  const [selectedRow, setSelectedRow] = useState<CatalogRecord | null>(null);
  const [rowToDelete, setRowToDelete] = useState<CatalogRecord | null>(null);
  const [isDeletingRow, setIsDeletingRow] = useState(false);
  const {
    rows,
    isFiltering,
    statusMessage,
    stats,
    rowsPerPage,
    handleFilter,
    handleCreateOrUpdate,
    handleDelete,
    setEditingStatusMessage,
    setCreateStatusMessage,
    creationOptions,
    refreshCreationOptions,
  } = useCatalogData();

  useEffect(() => {
    Modal.setAppElement("body");
  }, []);

  useEffect(() => {
    void handleFilter({ term: "", category: "all" });
  }, [handleFilter]);

  const activeFormAssetType = (editingRow?.assetType as CatalogAssetCreationType | undefined) ?? createAssetType;

  const formFields = useMemo(() => {
    if (!activeFormAssetType) {
      return [];
    }

    return buildCreateFields(activeFormAssetType, creationOptions);
  }, [activeFormAssetType, creationOptions]);

  const isEditingMode = Boolean(editingRow);
  const formLabel = isEditingMode ? "Atualizar" : "Salvar";
  const cancelLabel = isEditingMode ? "Cancelar" : "Limpar";

  const tableRows = useMemo(() => {
    const tvShowByKey = new Map(creationOptions.tvShows.map((option) => [option.value, option.label]));

    return rows.map((row) => {
      const bucket = row.assetType.toLowerCase();
      const isSeason = bucket.includes("season") || bucket.includes("temporad");

      if (!isSeason) {
        return row;
      }

      const seasonNumber = row.values.number?.trim();
      const relatedTitle = row.values.tvShowKey ? tvShowByKey.get(row.values.tvShowKey) : undefined;

      if (!seasonNumber && !relatedTitle) {
        return row;
      }

      const seasonLabel = seasonNumber ? `Temporada ${seasonNumber}` : "Temporada";
      const nameLabel = relatedTitle ? `${relatedTitle} - ${seasonLabel}` : seasonLabel;

      return {
        ...row,
        cells: [nameLabel, row.cells[1], row.cells[2]],
      };
    });
  }, [creationOptions.tvShows, rows]);

  const handleCreate = async (values: Record<string, string>) => {
    const recordLabel = getRecordLabel(values);

    try {
      const result = await handleCreateOrUpdate(values, editingRow, createAssetType ?? undefined);

      if (result.mode === "updated") {
        toast.success(`Registro ${recordLabel} atualizado com sucesso.`);
        setIsFormModalOpen(false);
        setEditingRow(null);
        setCreateAssetType(null);
        return;
      }
      toast.success(`Registro ${recordLabel} criado com sucesso.`);
      setIsFormModalOpen(false);
      setEditingRow(null);
      setCreateAssetType(null);
    } catch {
      toast.error("Falha ao salvar registro.");
      throw new Error("Falha ao salvar registro.");
    }
  };

  const handleEdit = (row: CatalogRecord) => {
    setEditingRow(row);
    setIsFormModalOpen(true);
    setEditingStatusMessage(row.values.title);
  };

  const handleOpenCreateModal = () => {
    void refreshCreationOptions();
    setEditingRow(null);
    setIsCreateTypeModalOpen(true);
    setIsFormModalOpen(false);
    setCreateAssetType(null);
    setCreateStatusMessage();
  };

  const handleSelectCreateType = (assetType: CatalogAssetCreationType) => {
    setCreateAssetType(assetType);
    setIsCreateTypeModalOpen(false);
    setIsFormModalOpen(true);
    setCreateStatusMessage();
  };

  const handleCloseCreateTypeModal = () => {
    setIsCreateTypeModalOpen(false);
  };

  const handleReturnToTypeSelection = () => {
    if (isEditingMode) {
      handleCloseModal();
      return;
    }

    setIsFormModalOpen(false);
    setCreateAssetType(null);
    setIsCreateTypeModalOpen(true);
    setCreateStatusMessage();
  };

  const handleCancelCreateFlow = () => {
    setIsFormModalOpen(false);
    setIsCreateTypeModalOpen(false);
    setEditingRow(null);
    setCreateAssetType(null);
  };

  const handleCloseModal = () => {
    if (isEditingMode) {
      setIsFormModalOpen(false);
      setEditingRow(null);
      return;
    }

    handleCancelCreateFlow();
  };

  const handleOpenDetailsModal = (row: CatalogRecord) => {
    setSelectedRow(row);
  };

  const handleCloseDetailsModal = () => {
    setSelectedRow(null);
  };

  const handleRequestDelete = (row: CatalogRecord) => {
    setRowToDelete(row);
  };

  const handleCloseDeleteModal = () => {
    if (isDeletingRow) {
      return;
    }

    setRowToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!rowToDelete) {
      return;
    }

    try {
      setIsDeletingRow(true);
      const result = await handleDelete(rowToDelete);
      toast.success(`Registro ${rowToDelete.values.title} removido com sucesso.`);

      if (editingRow?.id === result.id) {
        setEditingRow(null);
      }

      setRowToDelete(null);
    } catch {
      toast.error("Falha ao remover registro.");
    } finally {
      setIsDeletingRow(false);
    }
  };

  const relationshipLabelByKey = useMemo(() => {
    const labels = new Map<string, string>();

    for (const option of creationOptions.tvShows) {
      labels.set(option.value, option.label);
    }

    for (const option of creationOptions.seasons) {
      labels.set(option.value, option.label);
    }

    return labels;
  }, [creationOptions]);

  const detailHeaderTitle = useMemo(() => {
    if (!selectedRow) {
      return "Registro";
    }

    const isSeason = selectedRow.assetType.toLowerCase().includes("season") || selectedRow.assetType.toLowerCase().includes("temporad");

    if (!isSeason) {
      return selectedRow.values.title ?? "Registro";
    }

    const relatedTitle = selectedRow.values.tvShowKey ? relationshipLabelByKey.get(selectedRow.values.tvShowKey) : undefined;
    const seasonNumber = selectedRow.values.number?.trim();

    if (relatedTitle && seasonNumber) {
      return `${relatedTitle} - Temporada ${seasonNumber}`;
    }

    if (relatedTitle) {
      return relatedTitle;
    }

    if (seasonNumber) {
      return `Temporada ${seasonNumber}`;
    }

    return selectedRow.values.title ?? "Registro";
  }, [relationshipLabelByKey, selectedRow]);

  return (
    <div className={styles.page}>
      <Topbar
        title="GoLedger TV Shows"
        description="Painel base para criar, editar e consultar series, temporadas e episodios."
        actionLabel="Novo registro"
        onAction={handleOpenCreateModal}
      />

      <main className={styles.content}>
        <section className={styles.stats}>
          {stats.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </section>

        <FilterBar
          searchPlaceholder="Buscar por titulo, descricao ou episodio"
          categories={["Series", "Temporadas", "Episodios", "Watchlists"]}
          isLoading={isFiltering}
          onApply={handleFilter}
        />

        <section className={styles.workspaceGrid}>
          <div className={styles.workspaceFullWidth}>
            <DataTable
              caption="Lista de registros"
              columns={catalogColumns}
              rows={tableRows}
              rowsPerPage={rowsPerPage}
              isLoading={isFiltering}
              onRowClick={handleOpenDetailsModal}
              onEdit={handleEdit}
              onDelete={handleRequestDelete}
            />
          </div>
        </section>

        <WorkspacePanel title="Area de trabalho" description={statusMessage} />
      </main>

      <CatalogCreateFlowModals
        isCreateTypeModalOpen={isCreateTypeModalOpen}
        isFormModalOpen={isFormModalOpen}
        isEditingMode={isEditingMode}
        formTitle={editingRow ? `Editando ${editingRow.values.title}` : `Novo ${getCreationTypeLabel(createAssetType)}`}
        formDescription={editingRow ? "Atualize os dados do registro selecionado." : "Base para criar assets da aplicacao a partir da API."}
        fields={formFields}
        initialValues={editingRow?.values}
        submitLabel={formLabel}
        cancelLabel={isEditingMode ? cancelLabel : "Voltar"}
        onRequestCloseCreateTypeModal={handleCloseCreateTypeModal}
        onRequestCloseFormModal={handleCloseModal}
        onSelectCreateType={handleSelectCreateType}
        onSubmit={handleCreate}
        onCancel={handleReturnToTypeSelection}
      />

      <CatalogDetailModal
        selectedRow={selectedRow}
        relationshipLabelByKey={relationshipLabelByKey}
        detailHeaderTitle={detailHeaderTitle}
        onClose={handleCloseDetailsModal}
      />

      <Modal
        isOpen={Boolean(rowToDelete)}
        onRequestClose={handleCloseDeleteModal}
        shouldCloseOnOverlayClick={!isDeletingRow}
        shouldCloseOnEsc={!isDeletingRow}
        contentLabel="Confirmar exclusao"
        className={styles.confirmModal}
        overlayClassName={styles.formModalOverlay}
      >
        <div className={styles.confirmModalContent}>
          <h3>Confirmar exclusao</h3>
          <p>
            Deseja realmente excluir o registro
            {" "}
            <strong>{rowToDelete?.values.title}</strong>
            ?
          </p>
          <div className={styles.confirmModalActions}>
            <button type="button" onClick={handleCloseDeleteModal} disabled={isDeletingRow}>
              <span className={styles.actionLabel}>
                <Ban size={16} aria-hidden="true" />
                <span>Cancelar</span>
              </span>
            </button>
            <button type="button" onClick={handleConfirmDelete} disabled={isDeletingRow}>
              {isDeletingRow ? (
                <span className={styles.buttonLoading}>
                  <LoadingSpinner size={14} label="Excluindo" />
                  <span>Excluindo...</span>
                </span>
              ) : (
                "Excluir"
              )}
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer
        position="bottom-right"
        autoClose={3200}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </div>
  );
}
