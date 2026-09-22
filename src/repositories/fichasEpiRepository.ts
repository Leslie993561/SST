// Camada de acesso às tabelas `sst_entregas_epi` / `sst_fichas_epi` (Supabase)
// e ao bucket de Storage `anexos-sst` (via de assinatura da ficha) — antes,
// entregas e fichas de EPI existiam só no estado local (nunca sincronizadas
// com o Supabase) e a via assinada virava base64 em localStorage. RLS libera
// leitura/escrita para qualquer autenticado (toda conta do Portal SST é RH).

import { stamp } from "../domain/dates";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { EntregaEpi, FichaEntregaEpi } from "../types/domain";
import { uid } from "../store/seed";

const BUCKET = "anexos-sst";

interface EntregaEpiRow {
  id: string;
  colab_id: number;
  cpf: string;
  epi: string;
  qtd: number;
  ca: string;
  fornecedor: string;
  valor_unit: number;
  data_entrega: string;
  data_troca: string;
  obs: string;
  responsavel: string;
  assinatura: string;
  ficha_id: string | null;
  ts: string;
}

function entregaFromRow(row: EntregaEpiRow): EntregaEpi {
  return {
    id: row.id,
    colabId: row.colab_id,
    cpf: row.cpf,
    epi: row.epi,
    qtd: row.qtd,
    ca: row.ca,
    fornecedor: row.fornecedor,
    valorUnit: row.valor_unit,
    dataEntrega: row.data_entrega,
    dataTroca: row.data_troca,
    obs: row.obs,
    responsavel: row.responsavel,
    assinatura: row.assinatura,
    ts: row.ts,
    fichaId: row.ficha_id ?? undefined,
  };
}

interface FichaEpiRow {
  id: string;
  numero: number;
  colab_id: number;
  entrega_ids: string[];
  gerada_em: string;
  gerada_por: string;
  assinatura_file_name: string | null;
  assinatura_mime: string | null;
  assinatura_storage_path: string | null;
  assinatura_anexada_em: string | null;
  assinatura_responsavel: string | null;
}

function fichaFromRow(row: FichaEpiRow): FichaEntregaEpi {
  return {
    id: row.id,
    numero: row.numero,
    colabId: row.colab_id,
    entregaIds: row.entrega_ids,
    geradaEm: row.gerada_em,
    geradaPor: row.gerada_por,
    assinaturaFileName: row.assinatura_file_name ?? undefined,
    assinaturaMime: row.assinatura_mime ?? undefined,
    assinaturaStoragePath: row.assinatura_storage_path ?? undefined,
    assinaturaAnexadaEm: row.assinatura_anexada_em ?? undefined,
    assinaturaResponsavel: row.assinatura_responsavel ?? undefined,
  };
}

export async function getEntregasEpi(): Promise<EntregaEpi[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_entregas_epi").select("*").order("ts", { ascending: false });
  if (error) throw new Error(`Falha ao carregar entregas de EPI: ${error.message}`);
  return (data as EntregaEpiRow[]).map(entregaFromRow);
}

export async function getFichasEpi(): Promise<FichaEntregaEpi[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_fichas_epi").select("*").order("gerada_em", { ascending: false });
  if (error) throw new Error(`Falha ao carregar fichas de EPI: ${error.message}`);
  return (data as FichaEpiRow[]).map(fichaFromRow);
}

export interface RegistrarEntregaInput {
  colabId: number;
  cpf: string;
  epi: string;
  qtd: number;
  ca: string;
  fornecedor: string;
  valorUnit: number;
  dataEntrega: string;
  dataTroca: string;
  obs: string;
  responsavel: string;
  assinatura: string;
}

export type RegistrarEntregaResult = { ok: true; entrega: EntregaEpi } | { ok: false; error: string };

export async function registrarEntregaEpi(input: RegistrarEntregaInput): Promise<RegistrarEntregaResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  const id = uid("E");
  const ts = stamp();
  const { error } = await supabase.from("sst_entregas_epi").insert({
    id,
    colab_id: input.colabId,
    cpf: input.cpf,
    epi: input.epi,
    qtd: input.qtd,
    ca: input.ca,
    fornecedor: input.fornecedor,
    valor_unit: input.valorUnit,
    data_entrega: input.dataEntrega,
    data_troca: input.dataTroca,
    obs: input.obs,
    responsavel: input.responsavel,
    assinatura: input.assinatura,
    ts,
  });
  if (error) return { ok: false, error: `Falha ao registrar entrega: ${error.message}` };
  return {
    ok: true,
    entrega: {
      id,
      colabId: input.colabId,
      cpf: input.cpf,
      epi: input.epi,
      qtd: input.qtd,
      ca: input.ca,
      fornecedor: input.fornecedor,
      valorUnit: input.valorUnit,
      dataEntrega: input.dataEntrega,
      dataTroca: input.dataTroca,
      obs: input.obs,
      responsavel: input.responsavel,
      assinatura: input.assinatura,
      ts,
    },
  };
}

export interface EditarEntregaInput {
  epi: string;
  qtd: number;
  ca: string;
  fornecedor: string;
  valorUnit: number;
  dataEntrega: string;
  dataTroca: string;
  obs: string;
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

/** `.is("ficha_id", null)` reforça no servidor a mesma regra já aplicada no reducer:
 * uma entrega incluída numa ficha gerada fica congelada. */
export async function editarEntregaEpi(entregaId: string, input: EditarEntregaInput): Promise<SimpleResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  const { error } = await supabase
    .from("sst_entregas_epi")
    .update({
      epi: input.epi,
      qtd: input.qtd,
      ca: input.ca,
      fornecedor: input.fornecedor,
      valor_unit: input.valorUnit,
      data_entrega: input.dataEntrega,
      data_troca: input.dataTroca,
      obs: input.obs,
    })
    .eq("id", entregaId)
    .is("ficha_id", null);
  if (error) return { ok: false, error: `Falha ao editar entrega: ${error.message}` };
  return { ok: true };
}

export async function excluirEntregaEpi(entregaId: string): Promise<SimpleResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  const { error } = await supabase.from("sst_entregas_epi").delete().eq("id", entregaId).is("ficha_id", null);
  if (error) return { ok: false, error: `Falha ao excluir entrega: ${error.message}` };
  return { ok: true };
}

export interface GerarFichaInput {
  fichaId: string;
  colabId: number;
  numero: number;
  entregaIds: string[];
  geradaPor: string;
}

export type GerarFichaResult = { ok: true; geradaEm: string } | { ok: false; error: string };

export async function gerarFichaEpi(input: GerarFichaInput): Promise<GerarFichaResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  const geradaEm = stamp();
  const { error: fichaError } = await supabase.from("sst_fichas_epi").insert({
    id: input.fichaId,
    numero: input.numero,
    colab_id: input.colabId,
    entrega_ids: input.entregaIds,
    gerada_em: geradaEm,
    gerada_por: input.geradaPor,
  });
  if (fichaError) return { ok: false, error: `Falha ao gerar ficha: ${fichaError.message}` };

  const { error: entregasError } = await supabase.from("sst_entregas_epi").update({ ficha_id: input.fichaId }).in("id", input.entregaIds);
  if (entregasError) return { ok: false, error: `Ficha criada, mas falha ao vincular as entregas: ${entregasError.message}` };

  return { ok: true, geradaEm };
}

export type AnexarAssinaturaResult = { ok: true; storagePath: string; anexadaEm: string } | { ok: false; error: string };

export async function anexarAssinaturaFicha(fichaId: string, file: File, by: string): Promise<AnexarAssinaturaResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  const path = `epi-assinaturas/${fichaId}-${Date.now().toString(36)}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (uploadError) return { ok: false, error: `Falha ao enviar arquivo: ${uploadError.message}` };

  const anexadaEm = stamp();
  const { error: updateError } = await supabase
    .from("sst_fichas_epi")
    .update({
      assinatura_file_name: file.name,
      assinatura_mime: file.type,
      assinatura_storage_path: path,
      assinatura_anexada_em: anexadaEm,
      assinatura_responsavel: by,
    })
    .eq("id", fichaId);
  if (updateError) return { ok: false, error: `Falha ao salvar assinatura: ${updateError.message}` };

  return { ok: true, storagePath: path, anexadaEm };
}

export type SignedUrlResult = { ok: true; url: string } | { ok: false; error: string };

/** Gera uma URL temporária (10 min) para baixar/visualizar a via assinada — o bucket é privado.
 * Retorna o erro real (não só null) para a UI poder mostrar a causa direto na tela, sem
 * depender do console do navegador — createSignedUrl pode tanto resolver com um `error`
 * quanto rejeitar a Promise (ex.: falha de rede), por isso o try/catch cobre os dois casos. */
export async function getFichaSignedUrl(storagePath: string): Promise<SignedUrlResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 600);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[fichasEpiRepository] Falha ao gerar signed URL", { storagePath, error });
      return { ok: false, error: error.message };
    }
    return { ok: true, url: data.signedUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao gerar o link.";
    // eslint-disable-next-line no-console
    console.error("[fichasEpiRepository] Exceção ao gerar signed URL", { storagePath, err });
    return { ok: false, error: message };
  }
}
