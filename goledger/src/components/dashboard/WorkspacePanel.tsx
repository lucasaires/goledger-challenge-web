import styles from "./workspace-panel.module.scss";

type WorkspacePanelProps = {
  title: string;
  description: string;
};

export function WorkspacePanel({ title, description }: WorkspacePanelProps) {
  return (
    <section className={styles.workspace}>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
