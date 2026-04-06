import styles from "../styles/topbar.module.scss";

type TopbarProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
};

export function Topbar({ title, description, actionLabel, onAction }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <button type="button" onClick={onAction}>{actionLabel}</button>
    </header>
  );
}
