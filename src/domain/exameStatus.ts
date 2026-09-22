import type { CatalogoExameOcupacional, ExameRegistro, StatusExame } from "../types/domain";
import { normalizeCargo } from "./text";
import { parseBR } from "./dates";

/**
 * Status é sempre recalculado a partir da data de vencimento em relação a "hoje",
 * nunca lido como valor congelado — assim o portal permanece correto conforme o
 * tempo passa, sem depender de uma nova exportação de planilha.
 */
export function computeExameStatus(proximaBR: string | null | undefined, hoje: Date = new Date()): StatusExame {
  const proxima = parseBR(proximaBR);
  if (!proxima) return "Necessita revisão";
  if (proxima.getFullYear() > hoje.getFullYear() + 3) return "Necessita revisão";
  const dias = Math.round((proxima.getTime() - hoje.getTime()) / 86_400_000);
  if (dias < 0) return "Vencido";
  if (dias <= 60) return "A vencer";
  return "Em dia";
}

/** Idade mínima do colaborador + catálogo — quando informado, um exame nunca realizado mas
 * ainda não exigido pela idade (ex.: ECG antes dos 40 anos, ver pcmsoIdadeMinFor()) deixa de
 * contar como "Pendente". Opcional para não quebrar quem só tem o exame em mãos. */
export interface ContextoIdadeExame {
  idadeColab: number | null;
  catalogo: CatalogoExameOcupacional[];
}

export function statusDoRegistro(exame: ExameRegistro, hoje: Date = new Date(), contexto?: ContextoIdadeExame): StatusExame {
  const semRegistro = !exame.ultimo || exame.ultimo === "—";
  if (semRegistro && contexto) {
    const idadeMin = pcmsoIdadeMinFor(exame.proc, contexto.catalogo);
    if (idadeMin != null && (contexto.idadeColab == null || contexto.idadeColab < idadeMin)) return "Em dia";
  }
  if (semRegistro) return "Pendente";
  return computeExameStatus(exame.proximo, hoje);
}

const SEVERIDADE: Record<StatusExame, number> = {
  Vencido: 5,
  "Necessita revisão": 4,
  Pendente: 3,
  "A vencer": 2,
  "Em dia": 1,
};

/** Pior status entre uma lista de exames de um colaborador (usado para o resumo da ficha). */
export function statusGeralFor(exames: ExameRegistro[], hoje: Date = new Date(), contexto?: ContextoIdadeExame): StatusExame {
  if (!exames || exames.length === 0) return "Em dia";
  let pior: StatusExame = "Em dia";
  let piorSeveridade = 0;
  for (const exame of exames) {
    const status = statusDoRegistro(exame, hoje, contexto);
    const severidade = SEVERIDADE[status] ?? 0;
    if (severidade > piorSeveridade) {
      piorSeveridade = severidade;
      pior = status;
    }
  }
  return pior;
}

export type BadgeTone = "success" | "warning" | "danger" | "purple" | "info" | "neutral";

export function toneForStatus(status: StatusExame): BadgeTone {
  switch (status) {
    case "Em dia":
      return "success";
    case "A vencer":
    case "Pendente":
      return "warning";
    case "Necessita revisão":
      return "purple";
    case "Vencido":
      return "danger";
    default:
      return "neutral";
  }
}

/** Extrai a idade mínima exigida (critério do PCMSO) para um exame, se houver. */
export function pcmsoIdadeMinFor(proc: string, catalogo: CatalogoExameOcupacional[]): number | null {
  const codigo = /\((\d+)\)/.exec(proc)?.[1];
  let entrada = codigo ? catalogo.find((c) => c.codigo === codigo) : undefined;
  if (!entrada) {
    const nomeNormalizado = normalizeCargo(proc);
    entrada = catalogo.find((c) => c.nome && nomeNormalizado.includes(normalizeCargo(c.nome)));
  }
  if (!entrada) return null;
  const match = /a partir de\s*(\d+)\s*anos/i.exec((entrada.obs ?? []).join(" "));
  return match ? Number(match[1]) : null;
}

export function procCode(proc: string | null | undefined): string {
  return /\((\d+)\)/.exec(String(proc ?? ""))?.[1] ?? "";
}
