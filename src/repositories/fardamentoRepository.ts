// Camada de acesso às tabelas `sst_fardamento_entregas` / `sst_fardamento_reparos`
// (Supabase) — antes, entregas e reparos de fardamento existiam só no estado
// local (localStorage), nunca sincronizados com o Supabase. RLS libera
// leitura/escrita para qualquer autenticado (toda conta do Portal SST é RH).

import { stamp } from "../domain/dates";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { FardamentoEntrega, FardamentoReparo } from "../types/domain";
import { uid } from "../store/seed";

interface FardamentoEntregaRow {
  id: string;
  colab_id: number;
  cpf: string;
  tipo: string;
  qtd: number;
  tamanho: string;
  valor_unit: number;
  fornecedor: string;
  data_entrega: string;
  data_compra: string;
  obs: string;
  responsavel: string;
  ts: string;
}

function entregaFromRow(row: FardamentoEntregaRow): FardamentoEntrega {
  return {
    id: row.id,
    colabId: row.colab_id,
    cpf: row.cpf,
    tipo: row.tipo,
    qtd: row.qtd,
    tamanho: row.tamanho,
    valorUnit: row.valor_unit,
    fornecedor: row.fornecedor,
    dataEntrega: row.data_entrega,
    dataCompra: row.data_compra,
    obs: row.obs,
    responsavel: row.responsavel,
    ts: row.ts,
  };
}

export async function getFardamentoEntregas(): Promise<FardamentoEntrega[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_fardamento_entregas").select("*").order("ts", { ascending: false });
  if (error) throw new Error(`Falha ao carregar entregas de fardamento: ${error.message}`);
  return (data as FardamentoEntregaRow[]).map(entregaFromRow);
}

export interface RegistrarFardamentoEntregaInput {
  colabId: number;
  cpf: string;
  tipo: string;
  qtd: number;
  tamanho: string;
  valorUnit: number;
  fornecedor: string;
  dataEntrega: string;
  dataCompra: string;
  obs: string;
  responsavel: string;
}

export type RegistrarFardamentoEntregaResult = { ok: true; entrega: FardamentoEntrega } | { ok: false; error: string };

export async function registrarFardamentoEntrega(input: RegistrarFardamentoEntregaInput): Promise<RegistrarFardamentoEntregaResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  const id = uid("FE");
  const ts = stamp();
  const { error } = await supabase.from("sst_fardamento_entregas").insert({
    id,
    colab_id: input.colabId,
    cpf: input.cpf,
    tipo: input.tipo,
    qtd: input.qtd,
    tamanho: input.tamanho,
    valor_unit: input.valorUnit,
    fornecedor: input.fornecedor,
    data_entrega: input.dataEntrega,
    data_compra: input.dataCompra,
    obs: input.obs,
    responsavel: input.responsavel,
    ts,
  });
  if (error) return { ok: false, error: `Falha ao registrar entrega de fardamento: ${error.message}` };
  return { ok: true, entrega: { id, ...input, ts } };
}

interface FardamentoReparoRow {
  id: string;
  colab_id: number;
  cpf: string;
  peca: string;
  tipo_reparo: string;
  valor: number;
  fornecedor: string;
  data_reparo: string;
  obs: string;
  responsavel: string;
  ts: string;
}

function reparoFromRow(row: FardamentoReparoRow): FardamentoReparo {
  return {
    id: row.id,
    colabId: row.colab_id,
    cpf: row.cpf,
    peca: row.peca,
    tipoReparo: row.tipo_reparo,
    valor: row.valor,
    fornecedor: row.fornecedor,
    dataReparo: row.data_reparo,
    obs: row.obs,
    responsavel: row.responsavel,
    ts: row.ts,
  };
}

export async function getFardamentoReparos(): Promise<FardamentoReparo[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_fardamento_reparos").select("*").order("ts", { ascending: false });
  if (error) throw new Error(`Falha ao carregar reparos de fardamento: ${error.message}`);
  return (data as FardamentoReparoRow[]).map(reparoFromRow);
}

export interface RegistrarFardamentoReparoInput {
  colabId: number;
  cpf: string;
  peca: string;
  tipoReparo: string;
  valor: number;
  fornecedor: string;
  dataReparo: string;
  obs: string;
  responsavel: string;
}

export type RegistrarFardamentoReparoResult = { ok: true; reparo: FardamentoReparo } | { ok: false; error: string };

export async function registrarFardamentoReparo(input: RegistrarFardamentoReparoInput): Promise<RegistrarFardamentoReparoResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  const id = uid("FR");
  const ts = stamp();
  const { error } = await supabase.from("sst_fardamento_reparos").insert({
    id,
    colab_id: input.colabId,
    cpf: input.cpf,
    peca: input.peca,
    tipo_reparo: input.tipoReparo,
    valor: input.valor,
    fornecedor: input.fornecedor,
    data_reparo: input.dataReparo,
    obs: input.obs,
    responsavel: input.responsavel,
    ts,
  });
  if (error) return { ok: false, error: `Falha ao registrar reparo de fardamento: ${error.message}` };
  return { ok: true, reparo: { id, ...input, ts } };
}
