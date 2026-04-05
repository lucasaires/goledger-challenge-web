"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import { Ban, X } from "lucide-react";
import { CrudForm, DataTable, FilterBar } from "@/components/catalog";
import { StatCard, Topbar, WorkspacePanel } from "@/components/dashboard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import styles from "../../app/page.module.scss";
import type { CatalogRecord } from "@/lib/goledger";
import { useCatalogData } from "./useCatalogData";
import {
  buildCreateFields,
  catalogAssetCreationOptions,
  type CatalogAssetCreationType,
} from "./catalog-create-forms";

const catalogColumns = ["Nome", "Categoria", "Status"];

const detailLabelByKey: Record<string, string> = {
  title: "Titulo",
  description: "Descricao",
  recommendedAge: "Idade recomendada",
  number: "Numero",
  seasonNumber: "Numero da temporada",
  episodeNumber: "Numero do episodio",
  rating: "Avaliacao",
  releaseDate: "Data de lancamento",
  year: "Ano",
};

function getCreationTypeLabel(assetType: CatalogAssetCreationType | null) {
  if (!assetType) {
    return "registro";
  }

  return catalogAssetCreationOptions.find((option) => option.value === assetType)?.label ?? "registro";
}

function getRecordLabel(values: Record<string, string>) {
  return values.title ?? values.number ?? values.episodeNumber ?? "registro";
}

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

  const formValues = editingRow?.values;
  const isEditingMode = Boolean(editingRow);
  const formLabel = isEditingMode ? "Atualizar" : "Salvar";
  const cancelLabel = isEditingMode ? "Cancelar" : "Limpar";

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

    return Object.entries(selectedRow.values)
      .filter(([, value]) => value.trim().length > 0)
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
  }, [selectedRow]);

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
              rows={rows}
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

      <Modal
        isOpen={isCreateTypeModalOpen}
        onRequestClose={handleCloseCreateTypeModal}
        contentLabel="Selecionar tipo de registro"
        className={styles.confirmModal}
        overlayClassName={styles.formModalOverlay}
      >
        <div className={styles.confirmModalContent}>
          <h3>Novo registro</h3>
          <p>Escolha o tipo de asset para abrir o formulario correto.</p>
          <div className={styles.selectionModalActions}>
            {catalogAssetCreationOptions.map((option) => (
              <button key={option.value} type="button" className={styles.selectionModalButton} onClick={() => handleSelectCreateType(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isFormModalOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Formulario de cadastro"
        className={styles.formModal}
        overlayClassName={styles.formModalOverlay}
      >
        <div className={styles.formModalHeader}>
          <button type="button" onClick={handleCloseModal} aria-label="Cancelar formulario">
            <span className={styles.actionLabel}>
              <X size={16} aria-hidden="true" />
              <span>{isEditingMode ? "Fechar" : "Cancelar"}</span>
            </span>
          </button>
        </div>

        <CrudForm
          title={editingRow ? `Editando ${editingRow.values.title}` : `Novo ${getCreationTypeLabel(createAssetType)}`}
          description={editingRow ? "Atualize os dados do registro selecionado." : "Base para criar assets da aplicacao a partir da API."}
          fields={formFields}
          initialValues={formValues}
          submitLabel={formLabel}
          cancelLabel={isEditingMode ? cancelLabel : "Voltar"}
          onSubmit={handleCreate}
          onCancel={handleReturnToTypeSelection}
        />
      </Modal>

      <Modal
        isOpen={Boolean(selectedRow)}
        onRequestClose={handleCloseDetailsModal}
        contentLabel="Detalhes do registro"
        className={styles.detailsModal}
        overlayClassName={styles.formModalOverlay}
      >
        <div className={styles.detailsModalHeader}>
          <h3>Detalhes do registro</h3>
          <button type="button" onClick={handleCloseDetailsModal} aria-label="Fechar detalhes">
            <span className={styles.actionLabel}>
              <X size={16} aria-hidden="true" />
              <span>Fechar</span>
            </span>
          </button>
        </div>

        <section className={styles.detailsHighlight}>
          <h4>{selectedRow?.values.title ?? "Registro"}</h4>
          <div className={styles.detailsMeta}>
            <span>{selectedRow?.assetType ?? "-"}</span>
            <span>{selectedRow?.cells[2] ?? "-"}</span>
          </div>
        </section>

        <p className={styles.detailsSectionTitle}>Informacoes do item</p>

        <dl className={styles.detailsGrid}>
          {detailEntries.map(([key, value]) => (
            <div key={key} className={key === "description" ? styles.detailsDescription : undefined}>
              <dt>{formatDetailKey(key)}</dt>
              <dd>{formatDetailValue(key, value)}</dd>
            </div>
          ))}
        </dl>
      </Modal>

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
