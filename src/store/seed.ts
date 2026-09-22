import { portalRepository } from "../repositories/portalRepository";
import type { PrecoInfo } from "../types/domain";
import type { PortalState } from "./types";

function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const FARDAMENTO_TIPOS_SEED: Array<[string, number]> = [
  ["Conjunto de Helanca", 65],
  ["Conjunto Logística", 90],
  ["Camisa Polo", 45],
  ["Calça Operacional", 80],
  ["Jaleco Técnico", 55],
];

/** Preços "de fábrica" do catálogo estático — usados como estado inicial
 * (antes do Supabase carregar) e como base para mesclar com o que o RH já
 * editou (ver PortalStoreContext.tsx: catálogo estático + override do
 * Supabase, chave a chave, para uma chave nunca editada continuar mostrando
 * o valor padrão em vez de sumir). */
export function defaultEpiPrecos(): Record<string, PrecoInfo> {
  const epiPrecos: Record<string, PrecoInfo> = {};
  portalRepository.getEpiCatalogo().forEach((c) => {
    epiPrecos[c.equip] = { valor: c.valor, fornecedor: "", dataCotacao: "", historico: [] };
  });
  return epiPrecos;
}

export function defaultExamePrecos(): Record<string, PrecoInfo> {
  const examePrecos: Record<string, PrecoInfo> = {};
  portalRepository.getMatrizOcupacional().catalogoExames.forEach((e) => {
    examePrecos[e.codigo] = { valor: e.valor, fornecedor: "", dataCotacao: "", historico: [] };
  });
  return examePrecos;
}

export function defaultFardamentoPrecos(): Record<string, PrecoInfo> {
  const fardamentoPrecos: Record<string, PrecoInfo> = {};
  FARDAMENTO_TIPOS_SEED.forEach(([tipo, valor]) => {
    fardamentoPrecos[tipo] = { valor, fornecedor: "", dataCotacao: "", historico: [] };
  });
  return fardamentoPrecos;
}

/**
 * Estado inicial ANTES de colaboradores chegarem do Supabase (ver
 * PortalStoreContext, que despacha SET_COLABORADORES assim que a sessão do
 * usuário é confirmada). Entregas, custos e fardamento começam vazios —
 * refletem só o que o RH lançar de verdade, sem nenhum dado de demonstração.
 */
export function buildInitialState(): PortalState {
  const colaboradores: PortalState["colaboradores"] = [];

  const epiPrecos = defaultEpiPrecos();
  const examePrecos = defaultExamePrecos();
  const fardamentoPrecos = defaultFardamentoPrecos();

  return {
    version: 1,
    colaboradores,
    entregas: [],
    fichasEpi: [],
    attachments: [],
    desligados: {},
    desligamentosPendentes: [],
    asoDemissionalPendentes: [],
    epiPrecos,
    examePrecos,
    fardamentoPrecos,
    fardamentoEntregas: [],
    fardamentoReparos: [],
    matrizAdd: [],
    programasSaude: [],
    custosEpi: [],
    custosFardamento: [],
    log: [],
  };
}

export { uid };
