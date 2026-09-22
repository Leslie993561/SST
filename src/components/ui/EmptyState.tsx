import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      <div className={styles.title}>{title}</div>
      {description ? <div className={styles.description}>{description}</div> : null}
    </div>
  );
}
