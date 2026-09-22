// Camada de acesso à tabela `sst_log` (Supabase) — log de auditoria das ações
// do RH no portal. Antes existia só em localStorage (apagado ao limpar o
// cache do navegador). Insert-only por convenção da RLS (ver schema.sql) —
// nenhuma função de edição/exclusão é exposta aqui de propósito.

import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { LogEntry } from "../types/domain";

interface LogRow {
  action: string;
  colab_id: number | null;
  colab_nome: string;
  detail: string;
  user_email: string;
  ts: string;
}

function logFromRow(row: LogRow): LogEntry {
  return { action: row.action, colabId: row.colab_id, colabNome: row.colab_nome, detail: row.detail, user: row.user_email, ts: row.ts };
}

export async function getLog(): Promise<LogEntry[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_log").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(`Falha ao carregar log de auditoria: ${error.message}`);
  return (data as LogRow[]).map(logFromRow);
}

/** Best-effort — uma falha ao gravar o log não deve derrubar a ação principal
 * que já foi concluída com sucesso (o próprio Supabase, os anexos, etc). */
export async function registrarLog(entry: LogEntry): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase.from("sst_log").insert({
    id: `L${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    action: entry.action,
    colab_id: entry.colabId,
    colab_nome: entry.colabNome,
    detail: entry.detail,
    user_email: entry.user,
    ts: entry.ts,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[logRepository] Falha ao registrar log de auditoria", error);
  }
}
