// Helpers puros específicos do módulo de Exames Ocupacionais — não alteram nem duplicam
// a lógica de domínio compartilhada (src/domain/**), apenas compõem sobre ela.

import type { BadgeTone } from "../../../domain/exameStatus";
import { pcmsoIdadeMinFor } from "../../../domain/exameStatus";
import { idadeFromISO } from "../../../domain/dates";
import type { CargoOcupacional, CatalogoExameOcupacional, Colaborador, Desligamento } from "../../../types/domain";

/** Dígitos de um texto livre — usado para comparar contra CPF (que é sempre armazenado como dígitos). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Um colaborador combina com um texto de busca livre (nome ou dígitos do CPF). */
export function matchesColaboradorSearch(colab: Colaborador, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const digits = onlyDigits(term);
  return colab.nome.toLowerCase().includes(q) || (digits.length > 0 && colab.cpf.includes(digits));
}

/** Colaboradores ativos = base completa menos quem já foi desligado. */
export function ativosDe(colaboradores: Colaborador[], desligados: Record<number, Desligamento>): Colaborador[] {
  return colaboradores.filter((c) => !desligados[c.id]);
}

/** Todos os cargos ocupacionais conhecidos: os da matriz oficial + os adicionados pelo RH em runtime. */
export function todosOsCargos(cargosBase: CargoOcupacional[], matrizAdd: CargoOcupacional[]): CargoOcupacional[] {
  return [...cargosBase, ...matrizAdd];
}

const MESES_MAP: Record<number, BadgeTone> = { 24: "info", 6: "warning", 12: "success" };

export interface PeriodicidadeInfo {
  label: string;
  tone: BadgeTone;
}

/** Deriva rótulo + cor de uma string de periodicidade livre (ex.: "A cada 12 meses"). */
export function periodicidadeInfo(periodicidadeRaw: string | null | undefined): PeriodicidadeInfo {
  const raw = String(periodicidadeRaw ?? "").trim();
  const match = /(\d+)\s*mes/i.exec(raw);
  if (!match) return { label: "Sem periódico", tone: "neutral" };
  const meses = Number(match[1]);
  const label = raw.replace(/^a cada\s*/i, "");
  return { label, tone: MESES_MAP[meses] ?? "neutral" };
}

const ABREVIACOES_SITUACAO: Record<string, string> = {
  Admissional: "Adm.",
  Periódico: "Periódico",
  "Retorno ao trabalho": "Retorno",
  "Mudança de risco/função": "Mud. risco",
  Demissional: "Demiss.",
};

/** Abrevia o nome de uma situação de ASO para caber em colunas de tabela. */
export function abreviaSituacao(situacao: string): string {
  return ABREVIACOES_SITUACAO[situacao] ?? situacao;
}

/** Indica se o colaborador já atingiu a idade mínima do PCMSO para algum exame ainda não realizado. */
export function temAlertaIdade(colab: Colaborador, catalogo: CatalogoExameOcupacional[]): boolean {
  const idade = idadeFromISO(colab.nascimento);
  if (idade == null) return false;
  return (colab.exames ?? []).some((exame) => {
    if (exame.ultimo && exame.ultimo !== "—") return false;
    const idadeMin = pcmsoIdadeMinFor(exame.proc, catalogo);
    return idadeMin != null && idade >= idadeMin;
  });
}

const TIPOS_ASO_LOCAL = ["Admissional", "Periódico", "Retorno ao trabalho", "Demissional"];

export function tiposAso(): string[] {
  return TIPOS_ASO_LOCAL.slice();
}
