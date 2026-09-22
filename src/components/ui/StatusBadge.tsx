import type { BadgeTone } from "../../domain/exameStatus";
import styles from "./StatusBadge.module.css";

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>;
}
