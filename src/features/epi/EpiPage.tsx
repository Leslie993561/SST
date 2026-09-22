import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "../../components/ui";
import type { TabItem } from "../../components/ui";
import { ColaboradoresTab } from "./tabs/ColaboradoresTab";
import { MatrizTab } from "./tabs/MatrizTab";
import { HistoricoTab } from "./tabs/HistoricoTab";
import { CustosTab } from "./tabs/CustosTab";
import { FardamentoTab } from "./tabs/FardamentoTab";
import styles from "./EpiPage.module.css";

const TABS: TabItem[] = [
  { key: "colaboradores", label: "Colaboradores" },
  { key: "matriz", label: "Matriz de EPI por função" },
  { key: "historico", label: "Histórico de entregas" },
  { key: "custos", label: "Custos & valores" },
  { key: "fardamento", label: "Fardamento" },
];

export function EpiPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname.split("/").filter(Boolean)[1] ?? "colaboradores";

  return (
    <div className={styles.page}>
      <Tabs items={TABS} active={active} onChange={(key) => navigate(`/epi/${key}`)} />
      <div className={styles.content}>
        <Routes>
          <Route index element={<Navigate to="/epi/colaboradores" replace />} />
          <Route path="colaboradores" element={<ColaboradoresTab />} />
          <Route path="matriz" element={<MatrizTab />} />
          <Route path="historico" element={<HistoricoTab />} />
          <Route path="custos" element={<CustosTab />} />
          <Route path="fardamento" element={<FardamentoTab />} />
          <Route path="*" element={<Navigate to="/epi/colaboradores" replace />} />
        </Routes>
      </div>
    </div>
  );
}
