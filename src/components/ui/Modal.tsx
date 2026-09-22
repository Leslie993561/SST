import type { ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Modal.module.css";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ title, subtitle, onClose, children, footer, width = 520 }: ModalProps) {
  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.dialog} style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
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
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
