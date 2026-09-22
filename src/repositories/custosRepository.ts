// Camada de acesso a `sst_custos_epi_mes` / `sst_custos_fardamento_mes`
// (Supabase) — orçamento mensal usado no gráfico "orçado x realizado" do
// Dashboard. Somente leitura: hoje não existe tela para o RH lançar esses
// valores (o campo já ficava sempre vazio em localStorage também); as
// tabelas já ficam prontas para quando essa tela for construída.

import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { CustoMesEpi, CustoMesFardamento } from "../store/types";

interface CustoEpiRow {
  mes: string;
  orcado: number;
  realizado_base: number;
}

export async function getCustosEpiMes(): Promise<CustoMesEpi[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_custos_epi_mes").select("*").order("mes", { ascending: true });
  if (error) throw new Error(`Falha ao carregar orçamento de EPI: ${error.message}`);
  return (data as CustoEpiRow[]).map((row) => ({ mes: row.mes, orcado: row.orcado, realizadoBase: row.realizado_base }));
}

interface CustoFardamentoRow {
  mes: string;
  orcado: number;
  entrega_base: number;
  reparo_base: number;
}

export async function getCustosFardamentoMes(): Promise<CustoMesFardamento[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_custos_fardamento_mes").select("*").order("mes", { ascending: true });
  if (error) throw new Error(`Falha ao carregar orçamento de fardamento: ${error.message}`);
  return (data as CustoFardamentoRow[]).map((row) => ({
    mes: row.mes,
    orcado: row.orcado,
    entregaBase: row.entrega_base,
    reparoBase: row.reparo_base,
  }));
}
