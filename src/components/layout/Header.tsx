import { useLocation } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { portalRepository } from "../../repositories/portalRepository";
import { pageMetaFromPath } from "./pageMeta";
import styles from "./Header.module.css";

export function Header() {
  const location = useLocation();
  const { user, canEdit, logout } = useAuth();
  const meta = pageMetaFromPath(location.pathname);
  const geradoEm = portalRepository.getGeradoEm();
  const iniciais = (user?.email ?? "").slice(0, 2).toUpperCase();

  return (
    <header className={styles.header}>
      <div>
        <div className={styles.title}>{meta.title}</div>
        <div className={styles.subtitle}>{meta.subtitle}</div>
      </div>
      <div className={styles.actions}>
        <span className={`${styles.roleChip} ${canEdit ? styles.roleChipEdit : styles.roleChipView}`}>
          {canEdit ? "RH · Administrador SST" : "Somente leitura"}
        </span>
        <span className={styles.meta}>Base unificada EPI + ASO · atualizado em {geradoEm}</span>
        <button type="button" className={styles.iconButton} title="Notificações">
          <Bell size={18} strokeWidth={1.75} />
        </button>
        <div className={styles.user}>
          <div className={styles.userAvatar}>{iniciais}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.email}</div>
            <div className={styles.userRole}>{canEdit ? "RH · Administrador SST" : "Somente leitura"}</div>
          </div>
          <button type="button" className={styles.logoutButton} title="Sair" onClick={logout}>
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
