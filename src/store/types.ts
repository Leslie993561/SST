import type {
  AsoDemissionalPendente,
  AttachmentExame,
  CargoOcupacional,
  Colaborador,
  Desligamento,
  DesligamentoPendente,
  EntregaEpi,
  FardamentoEntrega,
  FardamentoReparo,
  FichaEntregaEpi,
  LogEntry,
  PrecoInfo,
  ProgramaSaude,
} from "../types/domain";

export interface CustoMesEpi {
  mes: string; // aaaa-mm
  orcado: number;
  realizadoBase: number;
}

export interface CustoMesFardamento {
  mes: string;
  orcado: number;
  entregaBase: number;
  reparoBase: number;
}

/**
 * Estado editável do portal — tudo que o RH lança em uso (entregas, anexos,
 * preços, desligamentos). Os dados de origem (colaboradores, matrizes,
 * catálogos) vêm do PortalRepository e não são duplicados aqui; apenas os
 * campos "ultimo/proximo" dos exames de cada colaborador são atualizados
 * localmente quando um exame é anexado.
 */
export interface PortalState {
  version: 1;
  colaboradores: Colaborador[];
  entregas: EntregaEpi[];
  fichasEpi: FichaEntregaEpi[];
  attachments: AttachmentExame[];
  desligados: Record<number, Desligamento>;
  desligamentosPendentes: DesligamentoPendente[];
  asoDemissionalPendentes: AsoDemissionalPendente[];
  epiPrecos: Record<string, PrecoInfo>;
  examePrecos: Record<string, PrecoInfo>;
  fardamentoPrecos: Record<string, PrecoInfo>;
  fardamentoEntregas: FardamentoEntrega[];
  fardamentoReparos: FardamentoReparo[];
  matrizAdd: CargoOcupacional[];
  programasSaude: ProgramaSaude[];
  custosEpi: CustoMesEpi[];
  custosFardamento: CustoMesFardamento[];
  log: LogEntry[];
}
