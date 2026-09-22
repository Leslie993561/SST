// Análise de divergência entre os cargos em uso (colaboradores ativos) e os
// cargos previstos nos Programas de Saúde Ocupacional (matriz PCMSO/PGR,
// estática + adicionada pelo RH). Reaproveita `cargoOcupacionalPara` tal como
// já existe — não altera a lógica de correspondência, só coleta quem NÃO
// encontrou correspondência, para apresentar como sugestão de revisão.
//
// Isso é só um alerta informativo: nunca cria/edita/remove cargo, matriz de
// exames ou de EPI. A decisão de atualizar o programa é sempre do RH.

import { cargoOcupacionalPara } from "./matriz";
import type { CargoOcupacional, Colaborador } from "../types/domain";

export interface CargoSemCorrespondencia {
  cargo: string;
  colaboradores: { id: number; nome: string }[];
}

/** Cargos de colaboradores ATIVOS que não batem com nenhum cargo da matriz
 * (estática + adicionada pelo RH) — agrupados por nome de cargo exatamente
 * como está cadastrado no colaborador, para o RH ver quantas pessoas cada
 * divergência afeta. */
export function cargosSemCorrespondencia(colaboradoresAtivos: Colaborador[], todosOsCargosMatriz: CargoOcupacional[]): CargoSemCorrespondencia[] {
  const porCargo = new Map<string, CargoSemCorrespondencia>();
  for (const colab of colaboradoresAtivos) {
    if (!colab.cargo) continue;
    const encontrado = cargoOcupacionalPara(colab, todosOsCargosMatriz);
    if (encontrado) continue;
    const chave = colab.cargo.trim();
    if (!porCargo.has(chave)) porCargo.set(chave, { cargo: chave, colaboradores: [] });
    porCargo.get(chave)!.colaboradores.push({ id: colab.id, nome: colab.nome });
  }
  return [...porCargo.values()].sort((a, b) => b.colaboradores.length - a.colaboradores.length || a.cargo.localeCompare(b.cargo, "pt-BR"));
}
