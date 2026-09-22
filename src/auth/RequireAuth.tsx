import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { FullPageLoader } from "../components/ui/FullPageLoader";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <FullPageLoader label="Verificando sessão..." />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
