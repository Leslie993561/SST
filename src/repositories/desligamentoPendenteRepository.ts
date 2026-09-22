// Camada de acesso à tabela `peopleflow_desligamento_pendente` — criada e
// gravada pelo Portal PeopleFlow (ver README dele) quando a etapa final de
// uma movimentação de Desligamento é aprovada. O SST só lê (para notificar o
// RH no Dashboard) e apaga (quando a efetivação é confirmada por aqui, na
// tela "Desligar colaborador"). RLS libera leitura/escrita para qualquer
// autenticado — mesma conta Supabase Auth usada pelos dois portais.

import { isoToBR } from "../domain/dates";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { DesligamentoPendente } from "../types/domain";

interface DesligamentoPendenteRow {
  colaborador_nome: string;
  data_desligamento: string | null;
  motivo: string;
  solicitado_por: string;
  criado_em: string;
}

function fromRow(row: DesligamentoPendenteRow): DesligamentoPendente {
  return {
    colaboradorNome: row.colaborador_nome,
    dataDesligamento: row.data_desligamento ? isoToBR(row.data_desligamento) : "",
    dataDesligamentoIso: row.data_desligamento ?? "",
    motivo: row.motivo,
    solicitadoPor: row.solicitado_por,
    criadoEm: row.criado_em,
  };
}

export async function getDesligamentosPendentes(): Promise<DesligamentoPendente[]> {
  if (!supabaseConfigured) return [];

  const { data, error } = await supabase
    .from("peopleflow_desligamento_pendente")
    .select("*")
    .order("criado_em", { ascending: true });

  if (error) throw new Error(`Falha ao carregar desligamentos pendentes: ${error.message}`);
  return (data as DesligamentoPendenteRow[]).map(fromRow);
}

/** Remove a solicitação depois que o RH confirma o desligamento de fato (tela "Desligar colaborador"). */
export async function removerDesligamentoPendente(colaboradorNome: string): Promise<void> {
  if (!supabaseConfigured) return;

  const { error } = await supabase.from("peopleflow_desligamento_pendente").delete().eq("colaborador_nome", colaboradorNome);
  if (error) throw new Error(`Falha ao remover desligamento pendente: ${error.message}`);
}
