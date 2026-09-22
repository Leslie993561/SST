// Status de vencimento dos Programas de Saúde Ocupacional (PCMSO/PGR) — mesmo
// espírito do computeExameStatus em exameStatus.ts (sempre recalculado a
// partir de "hoje", nunca um valor congelado), mas com janela de alerta
// própria (90 dias, ciclo de renovação de programa é mais burocrático que um
// exame individual) e sem o caso "Pendente"/"Necessita revisão" — aqui a data
// de vigência ou existe (mesmo que só mês/ano) ou o programa simplesmente
// ainda não tem versão confirmada.
//
// Não reaproveita computeExameStatus() de propósito: os thresholds são
// diferentes e este módulo é só para Programas — exameStatus.ts continua
// intocado.

import type { PrecisaoData, ProgramaSaude, StatusPrograma } from "../types/domain";
import type { BadgeTone } from "./exameStatus";

const JANELA_ALERTA_DIAS = 90;

function parseDataPrograma(valor: string, precisao: PrecisaoData): Date | null {
  if (!valor) return null;
  if (precisao === "mes") {
    // "aaaa-mm" — usa o ÚLTIMO dia do mês como estimativa conservadora (pior
    // caso: se ainda não venceu nem no último dia do mês, com certeza está
    // vigente; nunca subestima um vencimento).
    const m = /^(\d{4})-(\d{2})$/.exec(valor);
    if (!m) return null;
    const ano = Number(m[1]);
    const mes = Number(m[2]);
    if (mes < 1 || mes > 12) return null;
    return new Date(ano, mes, 0); // dia 0 do mês seguinte = último dia do mês informado
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function diasRestantesPrograma(vigenciaFim: string, precisaoFim: PrecisaoData, hoje: Date = new Date()): number | null {
  const data = parseDataPrograma(vigenciaFim, precisaoFim);
  if (!data) return null;
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((data.getTime() - hojeSemHora.getTime()) / 86_400_000);
}

export function computeProgramaStatus(vigenciaFim: string, precisaoFim: PrecisaoData, hoje: Date = new Date()): StatusPrograma {
  const dias = diasRestantesPrograma(vigenciaFim, precisaoFim, hoje);
  if (dias === null) return "Vencido"; // sem data válida = trata como vencido, não deixa passar batido
  if (dias < 0) return "Vencido";
  if (dias <= JANELA_ALERTA_DIAS) return "Próximo do vencimento";
  return "Vigente";
}

export function toneForStatusPrograma(status: StatusPrograma): BadgeTone {
  if (status === "Vigente") return "success";
  if (status === "Próximo do vencimento") return "warning";
  return "danger";
}

/** Última versão de cada programa (PCMSO/PGR), pela vigência mais recente —
 * usada para status/alerta. Histórico completo continua disponível em
 * `state.programasSaude`, só ordenado/filtrado na tela. */
export function versoesMaisRecentes(programas: ProgramaSaude[]): ProgramaSaude[] {
  const porPrograma = new Map<string, ProgramaSaude>();
  for (const p of programas) {
    const atual = porPrograma.get(p.programa);
    if (!atual || p.vigenciaFim > atual.vigenciaFim || (p.vigenciaFim === atual.vigenciaFim && p.ts > atual.ts)) {
      porPrograma.set(p.programa, p);
    }
  }
  return [...porPrograma.values()];
}
