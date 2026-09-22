import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  percent: number;
  color?: string;
}

export function ProgressBar({ percent, color = "var(--color-brand)" }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={styles.track}>
      <div className={styles.fill} style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}
