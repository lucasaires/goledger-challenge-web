import styles from "./topbar.module.scss";

type TopbarProps = {
  title: string;
  description: string;
  actionLabel: string;
};

export function Topbar({ title, description, actionLabel }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <button type="button">{actionLabel}</button>
    </header>
  );
}
