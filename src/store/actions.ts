import type {
  AsoDemissionalPendente,
  AttachmentExame,
  CargoOcupacional,
  Colaborador,
  DesligamentoPendente,
  EntregaEpi,
  FardamentoEntrega,
  FardamentoReparo,
  FichaEntregaEpi,
  LogEntry,
  PrecoInfo,
  ProgramaSaude,
} from "../types/domain";
import type { CustoMesEpi, CustoMesFardamento } from "./types";

export type PortalAction =
  | { type: "SET_COLABORADORES"; colaboradores: Colaborador[] }
  | { type: "SET_DESLIGAMENTOS_PENDENTES"; desligamentosPendentes: DesligamentoPendente[] }
  | { type: "REMOVER_DESLIGAMENTO_PENDENTE"; colaboradorNome: string }
  | { type: "SET_ASO_DEMISSIONAL_PENDENTES"; pendentes: AsoDemissionalPendente[] }
  // `pendente` já vem construída no call site (ver ExameFichaDrawer.handleDesligar) — a
  // gravação em sst_aso_demissional_pendentes é best-effort, igual ao log de auditoria.
  | { type: "ADICIONAR_ASO_DEMISSIONAL_PENDENTE"; pendente: AsoDemissionalPendente }
  | { type: "REMOVER_ASO_DEMISSIONAL_PENDENTE"; colabId: number }
  // Todo o estado abaixo (entregas/fichas EPI, anexos, fardamento, preços,
  // matriz, custos, log) é carregado do Supabase assim que a sessão é
  // confirmada (ver PortalStoreContext.tsx) — mesmo padrão de SET_COLABORADORES.
  | { type: "SET_ENTREGAS_EPI"; entregas: EntregaEpi[] }
  | { type: "SET_FICHAS_EPI"; fichasEpi: FichaEntregaEpi[] }
  | { type: "SET_ANEXOS_EXAMES"; attachments: AttachmentExame[] }
  | { type: "SET_FARDAMENTO_ENTREGAS"; fardamentoEntregas: FardamentoEntrega[] }
  | { type: "SET_FARDAMENTO_REPAROS"; fardamentoReparos: FardamentoReparo[] }
  | { type: "SET_EPI_PRECOS"; epiPrecos: Record<string, PrecoInfo> }
  | { type: "SET_EXAME_PRECOS"; examePrecos: Record<string, PrecoInfo> }
  | { type: "SET_FARDAMENTO_PRECOS"; fardamentoPrecos: Record<string, PrecoInfo> }
  | { type: "SET_MATRIZ_ADD"; matrizAdd: CargoOcupacional[] }
  | { type: "SET_PROGRAMAS_SAUDE"; programasSaude: ProgramaSaude[] }
  // `versao` já vem persistida (ver programasSaudeRepository.registrarVersaoPrograma) —
  // só acrescenta ao histórico local, nunca substitui uma versão anterior.
  | { type: "ADICIONAR_VERSAO_PROGRAMA"; versao: ProgramaSaude }
  | { type: "SET_CUSTOS_EPI"; custosEpi: CustoMesEpi[] }
  | { type: "SET_CUSTOS_FARDAMENTO"; custosFardamento: CustoMesFardamento[] }
  | { type: "SET_LOG"; log: LogEntry[] }
  // Toda ação que antes prependia uma entrada de log direto no reducer agora
  // despacha essa entrada explicitamente (o registro em si já foi gravado no
  // Supabase via logRepository.registrarLog — ver os call sites) — reforça
  // que o log é só mais um dado persistido, igual aos outros.
  | { type: "ADICIONAR_LOG_ENTRY"; entry: LogEntry }
  // `entrega` já vem persistida (ver fichasEpiRepository.registrarEntregaEpi) — o
  // reducer só precisa somar ao estado local.
  | { type: "REGISTRAR_ENTREGA_EPI"; entrega: EntregaEpi }
  | {
      type: "EDITAR_ENTREGA_EPI";
      entregaId: string;
      epi: string;
      qtd: number;
      ca: string;
      fornecedor: string;
      valorUnit: number;
      dataEntrega: string;
      dataTroca: string;
      obs: string;
    }
  | { type: "EXCLUIR_ENTREGA_EPI"; entregaId: string }
  | { type: "EDITAR_PRECO_EPI"; equip: string; preco: PrecoInfo }
  | { type: "EDITAR_PRECO_EXAME"; codigo: string; preco: PrecoInfo }
  | { type: "EDITAR_PRECO_FARDAMENTO"; tipo: string; preco: PrecoInfo }
  // `anexo` já vem persistido (ver anexosExamesRepository.anexarExame) — o
  // reducer só precisa somar ao estado local e patchar colaboradores.exames
  // (localmente — a gravação real já aconteceu via api/atualizar-exame).
  | { type: "ANEXAR_EXAME"; anexo: AttachmentExame; proximo: string }
  | { type: "DESLIGAR_COLABORADOR"; colabId: number; date: string; motivo: string; by: string }
  | {
      type: "ATUALIZAR_DADOS_COLABORADOR";
      colabId: number;
      cpf: string;
      nome: string;
      cargo: string;
      departamento: string;
      nascimento: string;
    }
  | { type: "REINTEGRAR_COLABORADOR"; colabId: number; by: string }
  // `cargo` já vem persistido (ver matrizAddRepository.adicionarCargoMatriz),
  // com _addedBy/_ts já preenchidos.
  | { type: "ADICIONAR_CARGO_MATRIZ"; cargo: CargoOcupacional }
  // `entrega`/`reparo` já vêm persistidos (ver fardamentoRepository.ts).
  | { type: "REGISTRAR_FARDAMENTO_ENTREGA"; entrega: FardamentoEntrega }
  | { type: "REGISTRAR_FARDAMENTO_REPARO"; reparo: FardamentoReparo }
  | { type: "GERAR_FICHA_EPI"; fichaId: string; numero: number; colabId: number; entregaIds: string[]; geradaEm: string; by: string }
  | { type: "ANEXAR_FICHA_EPI_ASSINADA"; fichaId: string; fileName: string; storagePath: string; mime: string; anexadaEm: string; by: string }
  | { type: "RESET" };
