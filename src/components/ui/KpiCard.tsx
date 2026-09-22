import type { ReactNode } from "react";
import { Card } from "./Card";
import styles from "./KpiCard.module.css";

export type KpiTone = "brand" | "success" | "warning" | "danger";

interface KpiCardProps {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  tone?: KpiTone;
  highlighted?: boolean;
}

export function KpiCard({ icon, value, label, tone = "brand", highlighted = false }: KpiCardProps) {
  return (
    <Card className={`${styles.kpi} ${highlighted ? styles.highlighted : ""}`}>
      <div className={`${styles.icon} ${styles[tone]}`}>{icon}</div>
      <div className={`${styles.value} ${highlighted ? styles.valueDanger : ""}`}>{value}</div>
      <div className={styles.label}>{label}</div>
    </Card>
  );
}
