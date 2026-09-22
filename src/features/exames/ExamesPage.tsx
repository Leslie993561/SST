import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "../../components/ui";
import type { TabItem } from "../../components/ui";
import { ControleTab } from "./tabs/ControleTab";
import { ProximosTab } from "./tabs/ProximosTab";
import { PendenciasTab } from "./tabs/PendenciasTab";
import { MatrizFuncaoTab } from "./tabs/MatrizFuncaoTab";
import { MatrizOcupacionalTab } from "./tabs/MatrizOcupacionalTab";
import { CustosExamesTab } from "./tabs/CustosExamesTab";
import { HistoricoTab } from "./tabs/HistoricoTab";
import { DesligadosTab } from "./tabs/DesligadosTab";
import styles from "./ExamesPage.module.css";

const TABS: TabItem[] = [
  { key: "controle", label: "Controle de ASO" },
  { key: "proximos", label: "Próximos vencimentos" },
  { key: "pendencias", label: "Pendências" },
  { key: "matriz", label: "Matriz por função" },
  { key: "matriz-ocupacional", label: "Matriz ocupacional" },
  { key: "custos", label: "Custos & valores" },
  { key: "historico", label: "Histórico" },
  { key: "desligados", label: "Desligados" },
];

export function ExamesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname.split("/").filter(Boolean)[1] ?? "controle";

  return (
    <div className={styles.page}>
      <Tabs items={TABS} active={active} onChange={(key) => navigate(`/exames/${key}`)} />
      <div className={styles.content}>
        <Routes>
          <Route index element={<Navigate to="/exames/controle" replace />} />
          <Route path="controle" element={<ControleTab />} />
          <Route path="proximos" element={<ProximosTab />} />
          <Route path="pendencias" element={<PendenciasTab />} />
          <Route path="matriz" element={<MatrizFuncaoTab />} />
          <Route path="matriz-ocupacional" element={<MatrizOcupacionalTab />} />
          <Route path="custos" element={<CustosExamesTab />} />
          <Route path="historico" element={<HistoricoTab />} />
          <Route path="desligados" element={<DesligadosTab />} />
          <Route path="*" element={<Navigate to="/exames/controle" replace />} />
        </Routes>
      </div>
    </div>
  );
}
