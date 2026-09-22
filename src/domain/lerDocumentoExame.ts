// Leitura local (sem serviço externo) do PDF anexado a um ASO, usada para
// pré-marcar automaticamente quais exames da matriz ocupacional foram
// realizados. Só funciona com PDFs que tenham camada de texto — digitalizações
// ou fotos escaneadas como imagem não têm texto para extrair.

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ExameMatrizEntry } from "./matriz";

GlobalWorkerOptions.workerSrc = workerUrl;

const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizarTexto(value: string): string {
  return value.normalize("NFD").replace(DIACRITICOS, "").toUpperCase();
}

function tokenizar(value: string): string[] {
  return normalizarTexto(value)
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

function contemSubsequencia(tokens: string[], alvo: string[]): boolean {
  if (alvo.length === 0) return false;
  for (let i = 0; i <= tokens.length - alvo.length; i++) {
    let bate = true;
    for (let j = 0; j < alvo.length; j++) {
      if (tokens[i + j] !== alvo[j]) {
        bate = false;
        break;
      }
    }
    if (bate) return true;
  }
  return false;
}

function paraIso(dia: number, mes: number, ano: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const REGEX_DATA = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/g;

/** Tenta achar a data de realização no texto do documento — prioriza uma data logo
 * perto da palavra "data" (rótulo comum em laudos/ASOs: "Data da realização: ..."). Sem
 * um rótulo claro, só assume quando existe exatamente UMA data no documento inteiro —
 * evita escolher errado entre várias datas (nascimento, emissão, validade etc.). */
function extrairDataDoTexto(texto: string): string | null {
  const comRotulo = /data[^0-9]{0,25}?(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/i.exec(texto);
  if (comRotulo) {
    const iso = paraIso(Number(comRotulo[1]), Number(comRotulo[2]), Number(comRotulo[3]));
    if (iso) return iso;
  }
  const todas = [...texto.matchAll(REGEX_DATA)];
  if (todas.length === 1) {
    const [, dia, mes, ano] = todas[0];
    return paraIso(Number(dia), Number(mes), Number(ano));
  }
  return null;
}

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

export interface LeituraExamesResult {
  /** false quando o arquivo não é um PDF com texto legível (ex.: digitalização/foto) — a UI deve pedir seleção manual. */
  extraiu: boolean;
  keysEncontradas: string[];
  /** "aaaa-mm-dd" pronto pro <input type="date">, ou null quando não achou (ou achou mais de uma data candidata). */
  dataRealizacaoIso: string | null;
  /** Motivo de `extraiu: false` — "não é PDF" | "sem texto (digitalização/foto)" | "erro ao processar o PDF".
   * Só para diagnóstico (log/hint na UI); nunca bloqueia o preenchimento manual. */
  motivoFalha?: string;
}

/** Identifica, dentre `entries`, quais exames são citados no PDF anexado, e tenta achar a
 * data de realização no texto. */
export async function lerExamesDoDocumento(file: File, entries: ExameMatrizEntry[]): Promise<LeituraExamesResult> {
  const ehPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!ehPdf) return { extraiu: false, keysEncontradas: [], dataRealizacaoIso: null, motivoFalha: "O arquivo não é um PDF." };

  let texto = "";
  try {
    texto = await extrairTextoPdf(file);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[lerDocumentoExame] Falha ao processar o PDF", err);
    const motivo = err instanceof Error ? err.message : "erro desconhecido";
    return { extraiu: false, keysEncontradas: [], dataRealizacaoIso: null, motivoFalha: `Erro ao processar o PDF: ${motivo}` };
  }
  if (texto.trim().length < 10) {
    return {
      extraiu: false,
      keysEncontradas: [],
      dataRealizacaoIso: null,
      motivoFalha: "O PDF não tem texto selecionável (provável digitalização/foto).",
    };
  }

  const tokensDoc = tokenizar(texto);
  const keysEncontradas: string[] = [];
  for (const entry of entries) {
    const codigoSemZeros = entry.codigo.replace(/^0+(?=\d)/, "");
    const codigoBate = !!entry.codigo && (tokensDoc.includes(entry.codigo) || tokensDoc.includes(codigoSemZeros));
    const nomeTokens = tokenizar(entry.nome);
    const nomeBate = contemSubsequencia(tokensDoc, nomeTokens);
    if (codigoBate || nomeBate) keysEncontradas.push(entry.key);
  }

  return { extraiu: true, keysEncontradas, dataRealizacaoIso: extrairDataDoTexto(texto) };
}
