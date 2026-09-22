import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, supabaseAdmin } from "./_lib/adminAuth.js";

interface AtualizarExameBody {
  colabId?: number;
  proc?: string;
  ultimo?: string;
  proximo?: string;
}

interface ExameRow {
  proc: string;
  ultimo: string;
  proximo: string;
  status: string;
}

/** Patcha o registro de um exame em colaboradores.exames (jsonb) depois de um
 * anexo — mesma lógica que o reducer local fazia (ANEXAR_EXAME), agora
 * persistida. RLS não libera UPDATE em `colaboradores` via API pública, por
 * isso passa pela service_role key aqui (mesmo padrão de
 * api/atualizar-colaborador.ts). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Método não permitido." });
      return;
    }

    const auth = await requireAuth(req.headers.authorization);
    if (!auth.ok) {
      res.status(auth.status).json({ error: auth.error });
      return;
    }

    const body = (req.body as AtualizarExameBody | undefined) ?? {};
    const colabId = Number(body.colabId);
    const proc = String(body.proc ?? "").trim();
    const ultimo = String(body.ultimo ?? "").trim();
    const proximo = String(body.proximo ?? "").trim();

    if (!Number.isFinite(colabId) || !proc) {
      res.status(400).json({ error: "Informe colabId e proc." });
      return;
    }

    const { data: row, error: fetchError } = await supabaseAdmin
      .from("colaboradores")
      .select("exames")
      .eq("id", colabId)
      .single();

    if (fetchError || !row) {
      res.status(404).json({ error: fetchError?.message || "Colaborador não encontrado." });
      return;
    }

    const exames: ExameRow[] = Array.isArray(row.exames) ? row.exames : [];
    const novoRegistro: ExameRow = { proc, ultimo, proximo, status: "Em dia" };
    const idx = exames.findIndex((e) => e.proc === proc);
    const novosExames = idx >= 0 ? exames.map((e, i) => (i === idx ? novoRegistro : e)) : [...exames, novoRegistro];

    const { error: updateError } = await supabaseAdmin.from("colaboradores").update({ exames: novosExames }).eq("id", colabId);
    if (updateError) {
      res.status(500).json({ error: updateError.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/atualizar-exame]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro inesperado no servidor." });
  }
}
