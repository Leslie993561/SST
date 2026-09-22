import type {
  CargoOcupacional,
  Colaborador,
  ExameOcupacionalCargo,
  MatrizEpiFuncao,
} from "../types/domain";
import { normalizeCargo } from "./text";
import { procCode } from "./exameStatus";

/** Encontra a entrada da matriz de EPI cujo nome de função corresponde ao cargo do colaborador. */
export function matrizEpiParaColaborador(colab: Colaborador, matrizEpi: MatrizEpiFuncao[]): string[] {
  const cargoNormalizado = normalizeCargo(colab.cargo);
  const exata = matrizEpi.find((m) => normalizeCargo(m.funcao) === cargoNormalizado);
  const porPrefixo = matrizEpi.find(
    (m) =>
      normalizeCargo(m.funcao).indexOf(cargoNormalizado) === 0 ||
      (cargoNormalizado && cargoNormalizado.indexOf(normalizeCargo(m.funcao)) === 0),
  );
  const encontrada = exata ?? porPrefixo;
  if (encontrada && encontrada.epis.length > 0) return encontrada.epis.slice();
  return (colab.epis ?? []).slice();
}

/** Cargo correspondente na matriz ocupacional (PCMSO/PGR) para o colaborador. */
export function cargoOcupacionalPara(colab: Colaborador, cargos: CargoOcupacional[]): CargoOcupacional | null {
  if (!colab.cargo) return null;
  const cargoNormalizado = normalizeCargo(colab.cargo);
  return (
    cargos.find((c) => normalizeCargo(c.nome) === cargoNormalizado) ??
    cargos.find(
      (c) =>
        normalizeCargo(c.nome).indexOf(cargoNormalizado) === 0 ||
        cargoNormalizado.indexOf(normalizeCargo(c.nome)) === 0,
    ) ??
    null
  );
}

function parsePeriodicidadeMeses(str: string | null | undefined): number {
  const match = /(\d+)\s*mes/i.exec(String(str ?? ""));
  return match ? Number(match[1]) : 12;
}

function exameCorresponde(procStr: string, codigo: string, nome: string): boolean {
  const pc = procCode(procStr);
  if (codigo && pc && pc === String(codigo)) return true;
  const np = normalizeCargo(procStr);
  const nn = normalizeCargo(nome);
  return !!nn && (np === nn || np.includes(nn) || nn.includes(np.replace(/^\(\d+\)\s*/, "")));
}

export interface ExameMatrizEntry {
  key: string;
  codigo: string;
  nome: string;
  procStr: string;
  periodicidadeMeses: number;
  jaTem: boolean;
  ultimoAtual: string;
}

/** Exames previstos para um colaborador num tipo de ASO (admissional/periódico/...), via matriz PCMSO. */
export function examesDaMatrizParaTipo(
  colab: Colaborador,
  tipo: string,
  cargos: CargoOcupacional[],
): ExameMatrizEntry[] {
  const tipoNormalizado = normalizeCargo(tipo);
  const cargo = cargoOcupacionalPara(colab, cargos);

  const construir = (codigo: string, nome: string, meses: number): ExameMatrizEntry => {
    const procStr = codigo ? `(${codigo}) ${nome}` : nome;
    const existente = (colab.exames ?? []).find((e) => exameCorresponde(e.proc, codigo, nome));
    return {
      key: codigo || normalizeCargo(nome),
      codigo,
      nome,
      procStr: existente ? existente.proc : procStr,
      periodicidadeMeses: meses,
      jaTem: !!existente,
      ultimoAtual: existente ? existente.ultimo : "—",
    };
  };

  let lista: ExameMatrizEntry[] = [];
  if (cargo?.exames?.length) {
    const filtrados = cargo.exames.filter(
      (x: ExameOcupacionalCargo) =>
        !tipoNormalizado ||
        x.situacoes.some((s) => {
          const sn = normalizeCargo(s);
          return sn === tipoNormalizado || sn.includes(tipoNormalizado) || tipoNormalizado.includes(sn);
        }),
    );
    const base = filtrados.length ? filtrados : cargo.exames;
    lista = base.map((x) => construir(x.codigo || "", x.nome, parsePeriodicidadeMeses(x.periodicidade)));
  }
  if (lista.length === 0) {
    lista = (colab.exames ?? []).map((e) =>
      construir(procCode(e.proc), e.proc.replace(/^\(\d+\)\s*/, ""), 12),
    );
  }

  const vistos = new Set<string>();
  return lista.filter((e) => {
    if (vistos.has(e.key)) return false;
    vistos.add(e.key);
    return true;
  });
}
