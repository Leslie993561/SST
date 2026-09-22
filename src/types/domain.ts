// Entidades de domínio do Portal SST — espelham a base unificada EPI + ASO.

export type StatusExame = "Em dia" | "A vencer" | "Vencido" | "Necessita revisão" | "Pendente";

export interface ExameRegistro {
  proc: string;
  ultimo: string; // dd/mm/aaaa ou "—"
  proximo: string; // dd/mm/aaaa
  status: Exclude<StatusExame, "Pendente">;
}

export interface Colaborador {
  id: number;
  cpf: string;
  nome: string;
  cargo: string;
  departamento: string;
  epis: string[];
  exames: ExameRegistro[];
  origem: string;
  nascimento: string; // ISO aaaa-mm-dd
  desligado: boolean;
  dataDesligamento: string; // dd/mm/aaaa ou "" se não desligado
  motivoDesligamento: string;
  desligadoBy: string; // e-mail de quem registrou o desligamento
}

export interface MatrizEpiFuncao {
  funcao: string;
  epis: string[];
}

export interface MatrizProcFuncao {
  funcao: string;
  procedimentos: string[];
}

export interface EpiCatalogoItem {
  equip: string;
  valor: number;
}

export interface CatalogoExameOcupacional {
  codigo: string;
  nome: string;
  cargos: number;
  periodicidades: string[];
  situacoes: string[];
  obs: string[];
  /** Valor unitário de referência (R$) — mesmo papel do `valor` em EpiCatalogoItem: usado como base
   * quando ainda não há um preço editado em `state.examePrecos` para este código. */
  valor: number;
}

export interface CatalogoEpiOcupacional {
  epi: string;
  ca: string;
  cargos: number;
  riscos: string[];
}

export interface RiscoOcupacional {
  categoria: string;
  agente: string;
  exposicao: string;
}

export interface ExameOcupacionalCargo {
  codigo: string;
  nome: string;
  situacoes: string[];
  periodicidade: string;
  observacao: string;
}

export interface EpiOcupacionalCargo {
  epi: string;
}

export interface CargoOcupacional {
  nome: string;
  cbo: string;
  ambiente: string;
  riscos: RiscoOcupacional[];
  epis: EpiOcupacionalCargo[];
  exames: ExameOcupacionalCargo[];
  _addedBy?: string;
  _ts?: string;
}

export interface FonteOcupacional {
  pcmso: string;
  pgr: string;
  grauRisco: string;
  cnae: string;
}

export type NomePrograma = "PCMSO" | "PGR";

export type StatusPrograma = "Vigente" | "Próximo do vencimento" | "Vencido";

/** Precisão da data de vigência conhecida — "mes" quando o documento/texto de
 * origem só informa mês/ano (ex.: "vigência 04/2024–04/2025"), sem inventar o
 * dia. Vira "dia" quando o RH confirma a data exata pela tela. */
export type PrecisaoData = "dia" | "mes";

/**
 * Uma versão de um Programa de Saúde Ocupacional (PCMSO ou PGR). Cada
 * renovação/atualização gera uma linha NOVA (nunca sobrescreve a anterior) —
 * ver `sst_programas_saude` no Supabase. O status de vencimento é sempre
 * calculado a partir da versão mais recente de cada `programa`.
 */
export interface ProgramaSaude {
  id: string;
  programa: NomePrograma;
  descricao: string;
  /** "aaaa-mm-dd" ou "aaaa-mm", conforme `precisaoFim`. */
  vigenciaInicio: string;
  vigenciaFim: string;
  precisaoFim: PrecisaoData;
  /** true depois que o RH confirma a data (exata ou o mês/ano) pela tela —
   * enquanto false, é só uma extração automática aguardando conferência. */
  confirmado: boolean;
  confirmadoPor: string;
  confirmadoEm: string;
  /** De onde veio essa versão: texto já cadastrado na matriz, ou o nome do PDF carregado. */
  origem: string;
  fileName: string;
  storagePath?: string;
  registradoPor: string;
  ts: string;
}

export interface MatrizOcupacional {
  fonte: FonteOcupacional;
  catalogoExames: CatalogoExameOcupacional[];
  catalogoEpis: CatalogoEpiOcupacional[];
  cargos: CargoOcupacional[];
  observacoesGerais: string;
}

// ---------- estado editável (histórico, preços, desligamentos) ----------

export interface PrecoInfo {
  valor: number;
  fornecedor: string;
  dataCotacao: string;
  historico: PrecoHistoricoItem[];
}

export interface PrecoHistoricoItem {
  valor: number;
  fornecedor: string;
  dataCotacao: string;
  ts: string;
}

export interface EntregaEpi {
  id: string;
  colabId: number;
  cpf: string;
  epi: string;
  qtd: number;
  ca: string;
  fornecedor: string;
  valorUnit: number;
  dataEntrega: string; // dd/mm/aaaa
  dataTroca: string;
  obs: string;
  responsavel: string;
  assinatura: string;
  ts: string;
  /**
   * Ficha de entrega (FichaEntregaEpi) à qual esta entrega foi agrupada, quando o RH
   * gerou o PDF. Enquanto vazio, a entrega está no "lote aberto" do colaborador —
   * editável/excluível e ainda não impressa. Uma vez atribuída a uma ficha, a entrega
   * fica congelada (mesma lógica de "nunca substituir documento anterior").
   */
  fichaId?: string;
}

/**
 * Ficha de Entrega de EPI (PDF) — agrupa uma ou mais EntregaEpi geradas na mesma
 * solicitação. Novas entregas registradas depois da geração formam um novo lote,
 * que vira uma nova ficha na próxima vez que o RH gerar o PDF.
 */
export interface FichaEntregaEpi {
  id: string;
  /** Número sequencial global (1, 2, 3...), usado para montar o código "EPIRH001" exibido no PDF e na UI. */
  numero: number;
  colabId: number;
  /** ids das EntregaEpi incluídas nesta ficha, na ordem em que aparecem no PDF. */
  entregaIds: string[];
  geradaEm: string;
  geradaPor: string;
  /** Documento da ficha assinada, anexado pelo RH após a assinatura do colaborador (PDF/JPG/PNG). */
  assinaturaFileName?: string;
  assinaturaMime?: string;
  /** Caminho no bucket Storage `anexos-sst` (Supabase) — o conteúdo é baixado sob demanda via signed URL, nunca embutido aqui. */
  assinaturaStoragePath?: string;
  assinaturaAnexadaEm?: string;
  assinaturaResponsavel?: string;
}

export interface AttachmentExame {
  id: string;
  colabId: number;
  proc: string;
  dataISO: string;
  fornecedor: string;
  valor: number;
  fileName: string;
  /** Caminho no bucket Storage `anexos-sst` (Supabase) — o conteúdo é baixado sob demanda via signed URL, nunca embutido aqui. */
  storagePath?: string;
  ts: string;
  responsavel: string;
}

export interface Desligamento {
  date: string;
  motivo: string;
  by: string;
}

/** Solicitação de desligamento aprovada no Portal PeopleFlow, aguardando
 * efetivação aqui (tela "Desligar colaborador", com ASO demissional se
 * aplicável) — ver `peopleflow_desligamento_pendente` no Supabase. */
export interface DesligamentoPendente {
  colaboradorNome: string;
  dataDesligamento: string; // dd/mm/aaaa ou "" se não informada — exibição
  dataDesligamentoIso: string; // aaaa-mm-dd ou "" — usado para pré-preencher o input type="date"
  motivo: string;
  solicitadoPor: string;
  criadoEm: string;
}

/** Criada aqui mesmo no SST quando o RH confirma "possui mais de 90 dias?" = Sim
 * na tela "Desligar colaborador" — permanece até o ASO demissional ser de fato
 * anexado (ver `sst_aso_demissional_pendentes`); vira um card no Dashboard,
 * assim a etapa não fica só na sugestão de abrir o modal em seguida (que era
 * facilmente ignorada/fechada sem deixar rastro). */
export interface AsoDemissionalPendente {
  id: string;
  colabId: number;
  desligadoEm: string; // dd/mm/aaaa
  motivo: string;
  solicitadoPor: string;
  ts: string;
}

export interface FardamentoEntrega {
  id: string;
  colabId: number;
  cpf: string;
  tipo: string;
  qtd: number;
  tamanho: string;
  valorUnit: number;
  fornecedor: string;
  dataEntrega: string;
  dataCompra: string;
  obs: string;
  responsavel: string;
  ts: string;
}

export interface FardamentoReparo {
  id: string;
  colabId: number;
  cpf: string;
  peca: string;
  tipoReparo: string;
  valor: number;
  fornecedor: string;
  dataReparo: string;
  obs: string;
  responsavel: string;
  ts: string;
}

export interface LogEntry {
  action: string;
  colabId: number | null;
  colabNome: string;
  detail: string;
  user: string;
  ts: string;
}

export interface CustoMesOrcado {
  mes: string; // aaaa-mm
  orcado: number;
  realizadoBase: number;
}

export type UserRole = "rh" | "leitura";

export interface AuthUser {
  email: string;
  role: UserRole;
}
