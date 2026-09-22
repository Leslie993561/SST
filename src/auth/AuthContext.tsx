import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { AuthUser } from "../types/domain";

const DOMINIO_CORPORATIVO = "@msbbrasil.com";

function toAuthUser(session: Session | null): AuthUser | null {
  const email = session?.user?.email;
  if (!email) return null;
  // Toda conta autenticada aqui é RH: não há autocadastro (ver requestMagicLink,
  // shouldCreateUser: false) — contas só existem porque o RH as criou manualmente
  // no painel do Supabase. Se um dia houver um papel "somente leitura", ele viria
  // de uma tabela `profiles` associada ao usuário; hoje é sempre 'rh'.
  return { email, role: "rh" };
}

type AuthStatus = "loading" | "signed-out" | "signed-in";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** Envia o link de acesso por e-mail. Não cria conta nova — só contas já provisionadas pelo RH funcionam. */
  requestMagicLink: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    if (!supabaseConfigured) {
      setStatus("signed-out");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setStatus(data.session ? "signed-in" : "signed-out");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setStatus(newSession ? "signed-in" : "signed-out");
    });
    return () => subscription.unsubscribe();
  }, []);

  const requestMagicLink = useCallback(async (rawEmail: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    const email = rawEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { ok: false, error: "Informe um e-mail válido." };
    }
    if (!email.endsWith(DOMINIO_CORPORATIVO)) {
      return { ok: false, error: "Acesso restrito ao e-mail corporativo MSB (@msbbrasil.com). E-mails pessoais não são permitidos." };
    }
    if (!supabaseConfigured) {
      return { ok: false, error: "Supabase não configurado nesta instalação — veja .env.example." };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        // Sem isso, o Supabase usa a "Site URL" configurada no painel (Authentication >
        // URL Configuration) como destino do link do e-mail — se ela estiver com o valor
        // padrão (ex.: localhost:3000), o link quebra em qualquer outro ambiente. Ao
        // enviar a origem de onde o pedido partiu, o link sempre volta para o lugar certo
        // (localhost em dev, o domínio da Vercel em produção) — desde que essa mesma URL
        // esteja também na lista de "Redirect URLs" permitidas no painel do Supabase.
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      // Supabase retorna "Signups not allowed for otp" (ou similar) quando o e-mail
      // não tem conta provisionada — traduzimos para a mensagem que o RH já conhecia.
      if (/signup|not allowed|not found/i.test(error.message)) {
        return {
          ok: false,
          error: "E-mail não autorizado. O acesso é liberado individualmente pelo RH — não há cadastro aberto de usuários.",
        };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    if (supabaseConfigured) await supabase.auth.signOut();
    setSession(null);
    setStatus("signed-out");
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = toAuthUser(session);
    return { user, status, requestMagicLink, logout, canEdit: user?.role === "rh" };
  }, [session, status, requestMagicLink, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  return ctx;
}
