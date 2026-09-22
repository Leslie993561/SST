// Camada de acesso às tabelas de catálogo de preços (Supabase) — `sst_epi_precos`,
// `sst_exame_precos`, `sst_fardamento_precos`. Antes, esses catálogos existiam só
// em localStorage; o "valor de fábrica" continua vindo do catálogo estático
// (portalRepository), mas qualquer edição do RH agora persiste aqui e é
// mesclada por cima do catálogo estático em PortalStoreContext.tsx.

import { stamp } from "../domain/dates";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { PrecoInfo } from "../types/domain";

interface PrecoRow {
  valor: number;
  fornecedor: string;
  data_cotacao: string;
  historico: PrecoInfo["historico"];
}

function precoFromRow(row: PrecoRow): PrecoInfo {
  return { valor: row.valor, fornecedor: row.fornecedor, dataCotacao: row.data_cotacao, historico: row.historico ?? [] };
}

export type EditarPrecoResult = { ok: true; preco: PrecoInfo } | { ok: false; error: string };

async function getPrecos(table: string, keyColumn: string): Promise<Record<string, PrecoInfo>> {
  if (!supabaseConfigured) return {};
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw new Error(`Falha ao carregar ${table}: ${error.message}`);
  const out: Record<string, PrecoInfo> = {};
  for (const row of data as Array<PrecoRow & Record<string, string>>) {
    out[row[keyColumn]] = precoFromRow(row);
  }
  return out;
}

async function editarPreco(
  table: string,
  keyColumn: string,
  key: string,
  atual: PrecoInfo | undefined,
  valor: number,
  fornecedor: string,
  dataCotacao: string,
): Promise<EditarPrecoResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  const historico = atual
    ? [{ valor: atual.valor, fornecedor: atual.fornecedor, dataCotacao: atual.dataCotacao, ts: stamp() }, ...atual.historico]
    : [];
  const preco: PrecoInfo = { valor, fornecedor, dataCotacao, historico };
  const { error } = await supabase
    .from(table)
    .upsert({ [keyColumn]: key, valor, fornecedor, data_cotacao: dataCotacao, historico, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: `Falha ao salvar preço: ${error.message}` };
  return { ok: true, preco };
}

export const getEpiPrecos = () => getPrecos("sst_epi_precos", "equip");
export const editarPrecoEpi = (equip: string, atual: PrecoInfo | undefined, valor: number, fornecedor: string, dataCotacao: string) =>
  editarPreco("sst_epi_precos", "equip", equip, atual, valor, fornecedor, dataCotacao);

export const getExamePrecos = () => getPrecos("sst_exame_precos", "codigo");
export const editarPrecoExame = (codigo: string, atual: PrecoInfo | undefined, valor: number, fornecedor: string, dataCotacao: string) =>
  editarPreco("sst_exame_precos", "codigo", codigo, atual, valor, fornecedor, dataCotacao);

export const getFardamentoPrecos = () => getPrecos("sst_fardamento_precos", "tipo");
export const editarPrecoFardamento = (tipo: string, atual: PrecoInfo | undefined, valor: number, fornecedor: string, dataCotacao: string) =>
  editarPreco("sst_fardamento_precos", "tipo", tipo, atual, valor, fornecedor, dataCotacao);
