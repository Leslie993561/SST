// Camada de acesso à tabela `sst_aso_demissional_pendentes` — criada aqui mesmo
// no SST (ao contrário de `peopleflow_desligamento_pendente`, que vem do outro
// portal) quando o RH confirma "possui mais de 90 dias?" = Sim ao desligar um
// colaborador. É só um lembrete: nunca bloqueia nem é a fonte da verdade sobre
// o exame em si (isso é `sst_anexos_exames`) — por isso toda escrita aqui é
// best-effort (nunca falha a ação principal do RH), mesmo padrão de
// `logRepository.ts`.

import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { AsoDemissionalPendente } from "../types/domain";

interface AsoDemissionalPendenteRow {
  id: string;
  colab_id: number;
  desligado_em: string;
  motivo: string;
  solicitado_por: string;
  ts: string;
}

function fromRow(row: AsoDemissionalPendenteRow): AsoDemissionalPendente {
  return {
    id: row.id,
    colabId: row.colab_id,
    desligadoEm: row.desligado_em,
    motivo: row.motivo,
    solicitadoPor: row.solicitado_por,
    ts: row.ts,
  };
}

export async function getAsoDemissionalPendentes(): Promise<AsoDemissionalPendente[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_aso_demissional_pendentes").select("*").order("ts", { ascending: true });
  if (error) throw new Error(`Falha ao carregar pendências de ASO demissional: ${error.message}`);
  return (data as AsoDemissionalPendenteRow[]).map(fromRow);
}

/** Grava a pendência já construída localmente (mesmo padrão de `registrarLog`) — nunca lança. */
export async function registrarAsoDemissionalPendente(entry: AsoDemissionalPendente): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase.from("sst_aso_demissional_pendentes").insert({
    id: entry.id,
    colab_id: entry.colabId,
    desligado_em: entry.desligadoEm,
    motivo: entry.motivo,
    solicitado_por: entry.solicitadoPor,
    ts: entry.ts,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[asoDemissionalPendenteRepository] Falha ao gravar pendência", error);
  }
}

/** Remove a pendência quando o RH efetivamente anexa um exame na ficha do colaborador desligado. */
export async function removerAsoDemissionalPendente(colabId: number): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase.from("sst_aso_demissional_pendentes").delete().eq("colab_id", colabId);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[asoDemissionalPendenteRepository] Falha ao remover pendência", error);
  }
}
