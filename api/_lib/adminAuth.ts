// Helper compartilhado pelas Vercel Serverless Functions em api/*.ts. NUNCA
// importado pelo bundle do navegador — só roda em Node, no servidor da
// Vercel. Usa a service_role key (SUPABASE_SERVICE_ROLE_KEY, sem prefixo
// VITE_) para operações que a RLS bloqueia para a API pública (UPDATE em
// `colaboradores`).

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  // eslint-disable-next-line no-console
  console.error(
    "[api] Faltam VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel " +
      "(Project Settings > Environment Variables). SUPABASE_SERVICE_ROLE_KEY nunca deve ter prefixo VITE_.",
  );
}

export const supabaseAdmin = createClient(url || "https://placeholder.supabase.co", serviceRoleKey || "placeholder-key", {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type RequireAuthResult = { ok: true; email: string } | { ok: false; status: number; error: string };

/**
 * Confere que quem chamou a function tem uma sessão válida no Supabase Auth.
 * Não precisa checar perfil/role: no Portal SST toda conta autenticada é RH
 * (não há autocadastro — contas só existem porque o RH as criou manualmente
 * no painel do Supabase, ver AuthContext.tsx).
 */
export async function requireAuth(authHeader: string | string[] | undefined): Promise<RequireAuthResult> {
  if (!url || !serviceRoleKey) {
    return { ok: false, status: 500, error: "SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_URL) não configurada nas variáveis de ambiente da Vercel." };
  }

  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = raw?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "Token de autenticação ausente." };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email) {
    return { ok: false, status: 401, error: "Sessão inválida ou expirada." };
  }
  return { ok: true, email: data.user.email };
}
