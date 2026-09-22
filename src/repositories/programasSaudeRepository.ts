// Camada de acesso à tabela `sst_programas_saude` (Supabase) e ao bucket de
// Storage `anexos-sst` (mesmo bucket dos anexos de exame, path próprio
// `programas/<programa>/...`). Cada linha é uma VERSÃO de um programa
// (PCMSO/PGR) — nunca sobrescrita, isso é o que dá o histórico de
// atualizações pedido.

import { stamp } from "../domain/dates";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { NomePrograma, PrecisaoData, ProgramaSaude } from "../types/domain";
import { uid } from "../store/seed";

const BUCKET = "anexos-sst";

interface ProgramaSaudeRow {
  id: string;
  programa: string;
  descricao: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  precisao_fim: string;
  confirmado: boolean;
  confirmado_por: string;
  confirmado_em: string;
  origem: string;
  file_name: string;
  storage_path: string | null;
  registrado_por: string;
  ts: string;
}

function fromRow(row: ProgramaSaudeRow): ProgramaSaude {
  return {
    id: row.id,
    programa: row.programa as NomePrograma,
    descricao: row.descricao,
    vigenciaInicio: row.vigencia_inicio,
    vigenciaFim: row.vigencia_fim,
    precisaoFim: row.precisao_fim as PrecisaoData,
    confirmado: row.confirmado,
    confirmadoPor: row.confirmado_por,
    confirmadoEm: row.confirmado_em,
    origem: row.origem,
    fileName: row.file_name,
    storagePath: row.storage_path ?? undefined,
    registradoPor: row.registrado_por,
    ts: row.ts,
  };
}

export async function getProgramasSaude(): Promise<ProgramaSaude[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_programas_saude").select("*").order("ts", { ascending: false });
  if (error) throw new Error(`Falha ao carregar programas de saúde ocupacional: ${error.message}`);
  return (data as ProgramaSaudeRow[]).map(fromRow);
}

export interface NovaVersaoInput {
  programa: NomePrograma;
  descricao: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  precisaoFim: PrecisaoData;
  origem: string;
  file: File | null;
  confirmadoPor: string;
}

export type NovaVersaoResult = { ok: true; versao: ProgramaSaude } | { ok: false; error: string };

/** Registra uma nova versão de um programa — sempre com `confirmado: true`,
 * porque a tela só chama isso DEPOIS que o RH já revisou/confirmou a data
 * (extraída automaticamente ou digitada). Nunca sobrescreve a versão
 * anterior: é sempre um INSERT novo. */
export async function registrarVersaoPrograma(input: NovaVersaoInput): Promise<NovaVersaoResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };

  let storagePath: string | undefined;
  let fileName = "";
  if (input.file) {
    fileName = input.file.name;
    const path = `programas/${input.programa.toLowerCase()}/${Date.now().toString(36)}-${input.file.name}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, input.file, { upsert: false });
    if (uploadError) return { ok: false, error: `Falha ao enviar o arquivo: ${uploadError.message}` };
    storagePath = path;
  }

  const id = uid("PROG");
  const ts = stamp();
  const row = {
    id,
    programa: input.programa,
    descricao: input.descricao,
    vigencia_inicio: input.vigenciaInicio,
    vigencia_fim: input.vigenciaFim,
    precisao_fim: input.precisaoFim,
    confirmado: true,
    confirmado_por: input.confirmadoPor,
    confirmado_em: ts,
    origem: input.origem,
    file_name: fileName,
    storage_path: storagePath ?? null,
    registrado_por: input.confirmadoPor,
    ts,
  };
  const { error } = await supabase.from("sst_programas_saude").insert(row);
  if (error) return { ok: false, error: `Falha ao registrar a versão: ${error.message}` };

  return { ok: true, versao: fromRow(row as ProgramaSaudeRow) };
}

export type SignedUrlResult = { ok: true; url: string } | { ok: false; error: string };

/** Gera uma URL temporária (10 min) para baixar/visualizar o PDF de uma versão — bucket é privado. */
export async function getProgramaSignedUrl(storagePath: string): Promise<SignedUrlResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 600);
    if (error) return { ok: false, error: error.message };
    return { ok: true, url: data.signedUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao gerar o link.";
    return { ok: false, error: message };
  }
}
