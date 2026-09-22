import { titleCase } from "./text";
import type { Colaborador, LogEntry } from "../types/domain";

/** Nome (Title Case) do colaborador para uma entrada de log, ou "" quando a
 * ação não está ligada a um colaborador específico (ex.: edição de preço). */
export function nomeParaLog(colaboradores: Colaborador[], colabId: number | null): string {
  if (colabId == null) return "";
  return titleCase(colaboradores.find((c) => c.id === colabId)?.nome ?? "");
}

/** Monta uma LogEntry pronta para dispatch (`ADICIONAR_LOG_ENTRY`) e
 * persistência (`registrarLog`) — usado em todo call site que antes confiava
 * no reducer para construir o log internamente. */
export function criarLogEntry(params: { action: string; colabId: number | null; colaboradores: Colaborador[]; detail: string; user: string; ts: string }): LogEntry {
  return {
    action: params.action,
    colabId: params.colabId,
    colabNome: nomeParaLog(params.colaboradores, params.colabId),
    detail: params.detail,
    user: params.user,
    ts: params.ts,
  };
}
