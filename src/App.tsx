import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { PortalStoreProvider } from "./store/PortalStoreContext";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { EpiPage } from "./features/epi/EpiPage";
import { ExamesPage } from "./features/exames/ExamesPage";
import { RelatoriosPage } from "./features/relatorios/RelatoriosPage";
import { ConfigPage } from "./features/config/ConfigPage";
import { AcessosPage } from "./features/acessos/AcessosPage";
import { ProgramasPage } from "./features/programas/ProgramasPage";

function App() {
  return (
    <AuthProvider>
      <PortalStoreProvider>
        <BrowserRouter basename="/sst">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/epi/*" element={<EpiPage />} />
              <Route path="/exames/*" element={<ExamesPage />} />
              <Route path="/programas" element={<ProgramasPage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/config" element={<ConfigPage />} />
              <Route path="/acessos" element={<AcessosPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PortalStoreProvider>
    </AuthProvider>
  );
}

export default App;
