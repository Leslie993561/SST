import styles from "./FullPageLoader.module.css";

export function FullPageLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.spinner} />
      <div className={styles.label}>{label}</div>
    </div>
  );
}
