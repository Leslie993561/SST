// Leitura local (sem serviço externo) de PDF de PCMSO/PGR para tentar
// identificar automaticamente a vigência do programa — mesmo mecanismo de
// src/domain/lerDocumentoExame.ts (pdfjs-dist, só funciona com PDF com
// camada de texto). Nunca inventa o dia: se o texto só tem mês/ano, devolve
// precisao "mes" — a tela sempre pede confirmação do RH antes de gravar.

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PrecisaoData } from "../types/domain";

GlobalWorkerOptions.workerSrc = workerUrl;

async function extrairTextoPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const partes: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    partes.push(
      content.items.map((item) => (typeof (item as { str?: unknown }).str === "string" ? (item as { str: string }).str : "")).join(" "),
    );
  }
  return partes.join(" ");
}

function paraIsoDia(dia: number, mes: number, ano: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function paraIsoMes(mes: number, ano: number): string | null {
  if (mes < 1 || mes > 12) return null;
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export interface VigenciaExtraida {
  vigenciaInicio: string;
  vigenciaFim: string;
  precisao: PrecisaoData;
  /** Trecho do texto onde a vigência foi encontrada, para o RH conferir antes de confirmar. */
  trecho: string;
}

/** Data completa dd/mm/aaaa. */
const DATA_DIA = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/;
/** Só mês/ano, mm/aaaa. */
const DATA_MES = /(\d{1,2})[/.-](\d{4})/;

/** Procura um par de datas perto de "vigência"/"validade" (rótulo comum em
 * PCMSO/PGR: "vigência 04/2024 a 04/2025" ou "vigência 15/04/2024 a 15/04/2025").
 * Tenta primeiro dia completo nos dois lados; se não achar, cai para mês/ano —
 * nunca mistura um lado com dia e outro só com mês. */
export function extrairVigenciaDoTexto(texto: string): VigenciaExtraida | null {
  const janela = /vig[eê]ncia[^0-9]{0,15}(.{0,60})/i.exec(texto) ?? /validade[^0-9]{0,15}(.{0,60})/i.exec(texto);
  if (!janela) return null;
  const trechoBusca = janela[1];
  const trechoCompleto = janela[0];

  const datasDia = [...trechoBusca.matchAll(new RegExp(DATA_DIA, "g"))];
  if (datasDia.length >= 2) {
    const inicio = paraIsoDia(Number(datasDia[0][1]), Number(datasDia[0][2]), Number(datasDia[0][3]));
    const fim = paraIsoDia(Number(datasDia[1][1]), Number(datasDia[1][2]), Number(datasDia[1][3]));
    if (inicio && fim) return { vigenciaInicio: inicio, vigenciaFim: fim, precisao: "dia", trecho: trechoCompleto.trim() };
  }

  const datasMes = [...trechoBusca.matchAll(new RegExp(DATA_MES, "g"))];
  if (datasMes.length >= 2) {
    const inicio = paraIsoMes(Number(datasMes[0][1]), Number(datasMes[0][2]));
    const fim = paraIsoMes(Number(datasMes[1][1]), Number(datasMes[1][2]));
    if (inicio && fim) return { vigenciaInicio: inicio, vigenciaFim: fim, precisao: "mes", trecho: trechoCompleto.trim() };
  }

  return null;
}

export interface LeituraProgramaResult {
  extraiu: boolean;
  vigencia: VigenciaExtraida | null;
  textoCompleto: string;
  motivoFalha?: string;
}

export async function lerVigenciaDoDocumento(file: File): Promise<LeituraProgramaResult> {
  const ehPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!ehPdf) return { extraiu: false, vigencia: null, textoCompleto: "", motivoFalha: "O arquivo não é um PDF." };

  let texto = "";
  try {
    texto = await extrairTextoPdf(file);
  } catch (err) {
    const motivo = err instanceof Error ? err.message : "erro desconhecido";
    return { extraiu: false, vigencia: null, textoCompleto: "", motivoFalha: `Erro ao processar o PDF: ${motivo}` };
  }
  if (texto.trim().length < 10) {
    return { extraiu: false, vigencia: null, textoCompleto: "", motivoFalha: "O PDF não tem texto selecionável (provável digitalização/foto)." };
  }

  const vigencia = extrairVigenciaDoTexto(texto);
  if (!vigencia) {
    return { extraiu: true, vigencia: null, textoCompleto: texto, motivoFalha: "Não encontrei uma vigência clara no texto — informe manualmente." };
  }
  return { extraiu: true, vigencia, textoCompleto: texto };
}

/** Mesma extração, mas a partir de um texto já existente (usada para os
 * programas atuais, cuja descrição já está cadastrada na matriz ocupacional —
 * sem precisar de upload de PDF nenhum). */
export function extrairVigenciaDeTextoExistente(descricao: string): VigenciaExtraida | null {
  return extrairVigenciaDoTexto(descricao);
}
