import styles from "./loading-spinner.module.scss";

type LoadingSpinnerProps = {
  size?: number;
  className?: string;
  label?: string;
};

export function LoadingSpinner({ size = 14, className, label = "Carregando" }: LoadingSpinnerProps) {
  return (
    <span
      className={[styles.spinner, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    />
  );
}
