import type { ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Drawer.module.css";

interface DrawerProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Drawer({ title, subtitle, onClose, children, width = 480 }: DrawerProps) {
  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <aside className={styles.panel} style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{title}</div>
            {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </aside>
    </div>
  );
}
