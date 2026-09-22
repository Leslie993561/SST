import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, supabaseAdmin } from "./_lib/adminAuth.js";

interface DesligarBody {
  colabId?: number;
  dataIso?: string; // aaaa-mm-dd
  motivo?: string;
}

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

    const body = (req.body as DesligarBody | undefined) ?? {};
    const colabId = Number(body.colabId);
    const dataIso = String(body.dataIso || "").trim();
    const motivo = String(body.motivo || "").trim();

    if (!Number.isFinite(colabId) || !dataIso || !motivo) {
      res.status(400).json({ error: "Informe colabId, dataIso e motivo." });
      return;
    }

    const { error } = await supabaseAdmin
      .from("colaboradores")
      .update({
        desligado: true,
        data_desligamento: dataIso,
        motivo_desligamento: motivo,
        desligado_by: auth.email,
      })
      .eq("id", colabId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/desligar-colaborador]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro inesperado no servidor." });
  }
}
