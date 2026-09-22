// Camada de acesso às tabelas `sst_anexos_exames` (Supabase) e ao bucket de
// Storage `anexos-sst` — substitui o antigo esquema em que o arquivo virava
// base64 e ficava só em localStorage (nunca saía do navegador). RLS libera
// leitura/escrita para qualquer autenticado (toda conta do Portal SST é RH,
// ver api/_lib/adminAuth.ts); o único passo que exige service_role é o
// patch de `colaboradores.exames`, feito via api/atualizar-exame.ts.

import { stamp } from "../domain/dates";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { AttachmentExame } from "../types/domain";
import { uid } from "../store/seed";

const BUCKET = "anexos-sst";

interface AnexoExameRow {
  id: string;
  colab_id: number;
  proc: string;
  data_iso: string;
  fornecedor: string;
  valor: number;
  file_name: string;
  storage_path: string | null;
  ts: string;
  responsavel: string;
}

function fromRow(row: AnexoExameRow): AttachmentExame {
  return {
    id: row.id,
    colabId: row.colab_id,
    proc: row.proc,
    dataISO: row.data_iso,
    fornecedor: row.fornecedor,
    valor: row.valor,
    fileName: row.file_name,
    storagePath: row.storage_path ?? undefined,
    ts: row.ts,
    responsavel: row.responsavel,
  };
}

export async function getAnexosExames(): Promise<AttachmentExame[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_anexos_exames").select("*").order("ts", { ascending: false });
  if (error) throw new Error(`Falha ao carregar anexos de exame: ${error.message}`);
  return (data as AnexoExameRow[]).map(fromRow);
}

export interface AnexarExameInput {
  colabId: number;
  proc: string;
  dataISO: string;
  proximo: string;
  fornecedor: string;
  valor: number;
  file: File | null;
  by: string;
}

export type AnexarExameResult = { ok: true; anexo: AttachmentExame } | { ok: false; error: string };

/** Faz upload do arquivo (se houver), grava o anexo em sst_anexos_exames e
 * atualiza o status do exame em colaboradores.exames (via api/atualizar-exame,
 * service_role — RLS bloqueia UPDATE direto em `colaboradores`). */
export async function anexarExame(input: AnexarExameInput): Promise<AnexarExameResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };

  let storagePath: string | undefined;
  let fileName = "";
  if (input.file) {
    fileName = input.file.name;
    const path = `exames/${input.colabId}/${Date.now().toString(36)}-${input.file.name}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, input.file, { upsert: false });
    if (uploadError) return { ok: false, error: `Falha ao enviar arquivo: ${uploadError.message}` };
    storagePath = path;
  }

  const id = uid("A");
  const ts = stamp();
  const { error: insertError } = await supabase.from("sst_anexos_exames").insert({
    id,
    colab_id: input.colabId,
    proc: input.proc,
    data_iso: input.dataISO,
    fornecedor: input.fornecedor,
    valor: input.valor,
    file_name: fileName,
    storage_path: storagePath ?? null,
    ts,
    responsavel: input.by,
  });
  if (insertError) return { ok: false, error: `Falha ao registrar anexo: ${insertError.message}` };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, error: "Sessão expirada — faça login novamente." };

  const res = await fetch("/api/atualizar-exame", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ colabId: input.colabId, proc: input.proc, ultimo: input.dataISO, proximo: input.proximo }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || "Anexo salvo, mas falha ao atualizar o status do exame." };
  }

  return {
    ok: true,
    anexo: {
      id,
      colabId: input.colabId,
      proc: input.proc,
      dataISO: input.dataISO,
      fornecedor: input.fornecedor,
      valor: input.valor,
      fileName,
      storagePath,
      ts,
      responsavel: input.by,
    },
  };
}

export type SignedUrlResult = { ok: true; url: string } | { ok: false; error: string };

/** Gera uma URL temporária (10 min) para baixar/visualizar um anexo — o bucket é privado.
 * Retorna o erro real (não só null) para a UI poder mostrar a causa direto na tela, sem
 * depender do console do navegador — createSignedUrl pode tanto resolver com um `error`
 * quanto rejeitar a Promise (ex.: falha de rede), por isso o try/catch cobre os dois casos. */
export async function getAnexoSignedUrl(storagePath: string): Promise<SignedUrlResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 600);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[anexosExamesRepository] Falha ao gerar signed URL", { storagePath, error });
      return { ok: false, error: error.message };
    }
    return { ok: true, url: data.signedUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao gerar o link.";
    // eslint-disable-next-line no-console
    console.error("[anexosExamesRepository] Exceção ao gerar signed URL", { storagePath, err });
    return { ok: false, error: message };
  }
}
