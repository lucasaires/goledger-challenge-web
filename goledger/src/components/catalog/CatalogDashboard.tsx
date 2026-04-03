"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import { CrudForm, DataTable, FilterBar } from "@/components/catalog";
import { StatCard, Topbar, WorkspacePanel } from "@/components/dashboard";
import styles from "../../app/page.module.scss";
import type { CatalogRecord } from "@/lib/goledger";
import { useCatalogData } from "./useCatalogData";

const catalogColumns = ["Nome", "Categoria", "Status"];

export function CatalogDashboard() {
  const [editingRow, setEditingRow] = useState<CatalogRecord | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CatalogRecord | null>(null);
  const [rowToDelete, setRowToDelete] = useState<CatalogRecord | null>(null);
  const [isDeletingRow, setIsDeletingRow] = useState(false);
  const {
    rows,
    isFiltering,
    statusMessage,
    stats,
    handleFilter,
    handleCreateOrUpdate,
    handleDelete,
    setEditingStatusMessage,
    setCreateStatusMessage,
  } = useCatalogData();

  useEffect(() => {
    Modal.setAppElement("body");
  }, []);

  useEffect(() => {
    void handleFilter({ term: "", category: "all" });
  }, [handleFilter]);

  const handleCreate = async (values: Record<string, string>) => {
    try {
      const result = await handleCreateOrUpdate(values, editingRow);

      if (result.mode === "updated") {
        toast.success(`Registro ${values.title} atualizado com sucesso.`);
        setIsFormModalOpen(false);
        setEditingRow(null);
        return;
      }
      toast.success(`Registro ${values.title} criado com sucesso.`);
      setIsFormModalOpen(false);
      setEditingRow(null);
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
    setIsFormModalOpen(true);
    setCreateStatusMessage();
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingRow(null);
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

  const formValues = editingRow?.values;
  const formLabel = editingRow ? "Atualizar" : "Salvar";
  const cancelLabel = editingRow ? "Cancelar" : "Limpar";
  const formFields = useMemo(
    () => [
      {
        label: "Titulo",
        name: "title",
        placeholder: "Digite o titulo",
        readOnly: Boolean(editingRow),
      },
      {
        label: "Descricao",
        name: "description",
        placeholder: "Digite a descricao",
        as: "textarea" as const,
      },
      {
        label: "Idade recomendada",
        name: "recommendedAge",
        placeholder: "Ex: 14",
        type: "number",
      },
    ],
    [editingRow],
  );

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
              onRowClick={handleOpenDetailsModal}
              onEdit={handleEdit}
              onDelete={handleRequestDelete}
            />
          </div>
        </section>

        <WorkspacePanel title="Area de trabalho" description={statusMessage} />
      </main>

      <Modal
        isOpen={isFormModalOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Formulario de cadastro"
        className={styles.formModal}
        overlayClassName={styles.formModalOverlay}
      >
        <div className={styles.formModalHeader}>
          <button type="button" onClick={handleCloseModal} aria-label="Fechar formulario">
            Fechar
          </button>
        </div>

        <CrudForm
          title={editingRow ? `Editando ${editingRow.values.title}` : "Formulario de cadastro"}
          description="Base para criar e editar assets da aplicacao a partir da API."
          fields={formFields}
          initialValues={formValues}
          submitLabel={formLabel}
          cancelLabel={cancelLabel}
          onSubmit={handleCreate}
          onCancel={handleCloseModal}
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
            Fechar
          </button>
        </div>

        <dl className={styles.detailsGrid}>
          <div>
            <dt>Titulo</dt>
            <dd>{selectedRow?.values.title ?? "-"}</dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{selectedRow?.assetType ?? "-"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{selectedRow?.cells[2] ?? "-"}</dd>
          </div>
          <div>
            <dt>Idade recomendada</dt>
            <dd>{selectedRow?.values.recommendedAge ?? "-"}</dd>
          </div>
          <div className={styles.detailsDescription}>
            <dt>Descricao</dt>
            <dd>{selectedRow?.values.description ?? "-"}</dd>
          </div>
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
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmDelete} disabled={isDeletingRow}>
              {isDeletingRow ? "Excluindo..." : "Excluir"}
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
