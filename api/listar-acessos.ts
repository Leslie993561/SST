import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, supabaseAdmin } from "./_lib/adminAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Método não permitido." });
      return;
    }

    const auth = await requireAuth(req.headers.authorization);
    if (!auth.ok) {
      res.status(auth.status).json({ error: auth.error });
      return;
    }

    // Junta todos os usuários já provisionados no Supabase Auth (paginado —
    // listUsers não devolve tudo de uma vez).
    const usuarios: { email: string; criadoEm: string }[] = [];
    const perPage = 200;
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      data.users.forEach((u) => {
        if (u.email) usuarios.push({ email: u.email, criadoEm: u.created_at });
      });
      if (data.users.length < perPage) break;
    }

    usuarios.sort((a, b) => a.email.localeCompare(b.email));

    res.status(200).json({ usuarios });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/listar-acessos]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro inesperado no servidor." });
  }
}
