import type { ReactNode } from "react";
import styles from "./Table.module.css";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className={styles.thead}>
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className={styles.th}>{children}</th>;
}

export function Td({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return <td className={`${styles.td} ${mono ? "mono" : ""}`}>{children}</td>;
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr className={onClick ? styles.trClickable : undefined} onClick={onClick}>
      {children}
    </tr>
  );
}
