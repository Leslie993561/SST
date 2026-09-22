import { Outlet } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { usePortalStore } from "../../store/PortalStoreContext";
import { FullPageLoader } from "../ui/FullPageLoader";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import styles from "./AppShell.module.css";

export function AppShell() {
  const { state, colaboradoresLoading, colaboradoresError } = usePortalStore();

  if (colaboradoresError) {
    return (
      <div className={styles.errorScreen}>
        <AlertTriangle size={28} />
        <div className={styles.errorTitle}>Não foi possível carregar a base de colaboradores</div>
        <div className={styles.errorDetail}>{colaboradoresError}</div>
      </div>
    );
  }

  if (colaboradoresLoading && state.colaboradores.length === 0) {
    return <FullPageLoader label="Carregando base de colaboradores..." />;
  }

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
