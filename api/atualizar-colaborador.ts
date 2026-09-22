import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, supabaseAdmin } from "./_lib/adminAuth.js";

interface AtualizarColaboradorBody {
  colabId?: number;
  cpf?: string;
  nome?: string;
  cargo?: string;
  departamento?: string;
  nascimento?: string; // aaaa-mm-dd ou "" para limpar
}

/** Completa o cadastro de um colaborador (cpf, nome, cargo, departamento,
 * nascimento) — inclui o pré-cadastro criado automaticamente pelo Portal
 * PeopleFlow ao concluir uma Admissão (esse fluxo não coleta cpf/nascimento,
 * que são exclusivos do SST). Mesmo padrão RH-only + service_role de
 * api/desligar-colaborador.ts; RLS não libera UPDATE via API pública. */
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

    const body = (req.body as AtualizarColaboradorBody | undefined) ?? {};
    const colabId = Number(body.colabId);
    if (!Number.isFinite(colabId)) {
      res.status(400).json({ error: "Informe colabId." });
      return;
    }

    const cpf = String(body.cpf ?? "").replace(/\D/g, "");
    const nome = String(body.nome ?? "").trim();
    const cargo = String(body.cargo ?? "").trim();
    const departamento = String(body.departamento ?? "").trim();
    const nascimento = String(body.nascimento ?? "").trim();

    if (!nome) {
      res.status(400).json({ error: "Nome é obrigatório." });
      return;
    }
    if (cpf && cpf.length !== 11) {
      res.status(400).json({ error: "CPF inválido — informe 11 dígitos." });
      return;
    }
    if (nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) {
      res.status(400).json({ error: "Data de nascimento inválida (esperado aaaa-mm-dd)." });
      return;
    }

    const { error } = await supabaseAdmin
      .from("colaboradores")
      .update({
        cpf,
        nome,
        cargo,
        departamento,
        nascimento: nascimento || null,
      })
      .eq("id", colabId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/atualizar-colaborador]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro inesperado no servidor." });
  }
}
