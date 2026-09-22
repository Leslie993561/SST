// Helpers puros específicos do módulo de Gestão de EPI — não alteram nem duplicam
// a lógica de domínio compartilhada (src/domain/**), apenas compõem sobre ela.

import { matrizEpiParaColaborador } from "../../../domain/matriz";
import type { Colaborador, EntregaEpi, MatrizEpiFuncao } from "../../../types/domain";

/** Normaliza um nome de EPI para comparação (acentos, caixa, espaços) — só para diffs locais. */
export function normalizeEpiName(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Conjunto normalizado dos EPIs já entregues a um colaborador, a partir do histórico de entregas. */
export function entregasEpiSetFor(entregas: EntregaEpi[], colabId: number): Set<string> {
  const set = new Set<string>();
  for (const e of entregas) {
    if (e.colabId === colabId) set.add(normalizeEpiName(e.epi));
  }
  return set;
}

export interface DivergenciaEpi {
  obrigatorios: string[];
  semEntrega: string[];
}

/** EPIs obrigatórios da função do colaborador (via matriz) que ainda não têm nenhuma entrega registrada. */
export function divergenciaEpiPara(colab: Colaborador, matrizEpi: MatrizEpiFuncao[], entregas: EntregaEpi[]): DivergenciaEpi {
  const obrigatorios = matrizEpiParaColaborador(colab, matrizEpi);
  const entregues = entregasEpiSetFor(entregas, colab.id);
  const semEntrega = obrigatorios.filter((epi) => !entregues.has(normalizeEpiName(epi)));
  return { obrigatorios, semEntrega };
}

/** Demanda (nº de colaboradores ativos cuja função exige o item) por equipamento, conforme a matriz de EPI. */
export function demandaPorEquip(colaboradoresAtivos: Colaborador[], matrizEpi: MatrizEpiFuncao[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const colab of colaboradoresAtivos) {
    const epis = matrizEpiParaColaborador(colab, matrizEpi);
    for (const epi of epis) {
      map.set(epi, (map.get(epi) ?? 0) + 1);
    }
  }
  return map;
}

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
