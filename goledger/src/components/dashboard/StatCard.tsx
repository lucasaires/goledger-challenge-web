import styles from "./stat-card.module.scss";

type StatCardProps = {
  label: string;
  value: string | number;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <article className={styles.card}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
