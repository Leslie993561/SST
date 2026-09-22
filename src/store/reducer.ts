import type { PortalAction } from "./actions";
import { buildInitialState } from "./seed";
import type { PortalState } from "./types";

export function portalReducer(state: PortalState, action: PortalAction): PortalState {
  switch (action.type) {
    case "SET_COLABORADORES": {
      // A tabela colaboradores agora é a fonte da verdade para desligamento
      // (ver api/desligar-colaborador.ts) — reconstrói state.desligados a
      // partir dela a cada carga, em vez de confiar em estado local antigo.
      const desligados: PortalState["desligados"] = {};
      action.colaboradores.forEach((c) => {
        if (c.desligado) {
          desligados[c.id] = { date: c.dataDesligamento, motivo: c.motivoDesligamento, by: c.desligadoBy };
        }
      });
      return { ...state, colaboradores: action.colaboradores, desligados };
    }

    case "SET_DESLIGAMENTOS_PENDENTES":
      return { ...state, desligamentosPendentes: action.desligamentosPendentes };

    case "REMOVER_DESLIGAMENTO_PENDENTE":
      return {
        ...state,
        desligamentosPendentes: state.desligamentosPendentes.filter((d) => d.colaboradorNome !== action.colaboradorNome),
      };

    case "SET_ASO_DEMISSIONAL_PENDENTES":
      return { ...state, asoDemissionalPendentes: action.pendentes };

    case "ADICIONAR_ASO_DEMISSIONAL_PENDENTE":
      return {
        ...state,
        asoDemissionalPendentes: [...state.asoDemissionalPendentes.filter((p) => p.colabId !== action.pendente.colabId), action.pendente],
      };

    case "REMOVER_ASO_DEMISSIONAL_PENDENTE":
      return {
        ...state,
        asoDemissionalPendentes: state.asoDemissionalPendentes.filter((p) => p.colabId !== action.colabId),
      };

    case "SET_ENTREGAS_EPI":
      return { ...state, entregas: action.entregas };

    case "SET_FICHAS_EPI":
      return { ...state, fichasEpi: action.fichasEpi };

    case "SET_ANEXOS_EXAMES":
      return { ...state, attachments: action.attachments };

    case "SET_FARDAMENTO_ENTREGAS":
      return { ...state, fardamentoEntregas: action.fardamentoEntregas };

    case "SET_FARDAMENTO_REPAROS":
      return { ...state, fardamentoReparos: action.fardamentoReparos };

    case "SET_EPI_PRECOS":
      return { ...state, epiPrecos: action.epiPrecos };

    case "SET_EXAME_PRECOS":
      return { ...state, examePrecos: action.examePrecos };

    case "SET_FARDAMENTO_PRECOS":
      return { ...state, fardamentoPrecos: action.fardamentoPrecos };

    case "SET_MATRIZ_ADD":
      return { ...state, matrizAdd: action.matrizAdd };

    case "SET_PROGRAMAS_SAUDE":
      return { ...state, programasSaude: action.programasSaude };

    case "ADICIONAR_VERSAO_PROGRAMA":
      return { ...state, programasSaude: [action.versao, ...state.programasSaude] };

    case "SET_CUSTOS_EPI":
      return { ...state, custosEpi: action.custosEpi };

    case "SET_CUSTOS_FARDAMENTO":
      return { ...state, custosFardamento: action.custosFardamento };

    case "SET_LOG":
      return { ...state, log: action.log };

    case "ADICIONAR_LOG_ENTRY":
      return { ...state, log: [action.entry, ...state.log] };

    case "REGISTRAR_ENTREGA_EPI":
      return { ...state, entregas: [action.entrega, ...state.entregas] };

    case "EDITAR_ENTREGA_EPI": {
      const entrega = state.entregas.find((e) => e.id === action.entregaId);
      // Uma vez incluída numa ficha gerada, a entrega fica congelada — corrigir
      // exigiria reemitir a ficha e invalidar uma possível via já assinada.
      if (!entrega || entrega.fichaId) return state;
      return {
        ...state,
        entregas: state.entregas.map((e) =>
          e.id === action.entregaId
            ? {
                ...e,
                epi: action.epi,
                qtd: action.qtd,
                ca: action.ca,
                fornecedor: action.fornecedor,
                valorUnit: action.valorUnit,
                dataEntrega: action.dataEntrega,
                dataTroca: action.dataTroca,
                obs: action.obs,
              }
            : e,
        ),
      };
    }

    case "EXCLUIR_ENTREGA_EPI": {
      const entrega = state.entregas.find((e) => e.id === action.entregaId);
      if (!entrega || entrega.fichaId) return state;
      return { ...state, entregas: state.entregas.filter((e) => e.id !== action.entregaId) };
    }

    case "EDITAR_PRECO_EPI":
      return { ...state, epiPrecos: { ...state.epiPrecos, [action.equip]: action.preco } };

    case "EDITAR_PRECO_EXAME":
      return { ...state, examePrecos: { ...state.examePrecos, [action.codigo]: action.preco } };

    case "ANEXAR_EXAME": {
      const colaboradores = state.colaboradores.map((c) => {
        if (c.id !== action.anexo.colabId) return c;
        const exames = c.exames.some((e) => e.proc === action.anexo.proc)
          ? c.exames.map((e) =>
              e.proc === action.anexo.proc
                ? { ...e, ultimo: action.anexo.dataISO, proximo: action.proximo, status: "Em dia" as const }
                : e,
            )
          : [...c.exames, { proc: action.anexo.proc, ultimo: action.anexo.dataISO, proximo: action.proximo, status: "Em dia" as const }];
        return { ...c, exames };
      });
      return { ...state, colaboradores, attachments: [action.anexo, ...state.attachments] };
    }

    case "DESLIGAR_COLABORADOR":
      return {
        ...state,
        desligados: { ...state.desligados, [action.colabId]: { date: action.date, motivo: action.motivo, by: action.by } },
      };

    case "ATUALIZAR_DADOS_COLABORADOR": {
      const colaboradores = state.colaboradores.map((c) =>
        c.id === action.colabId
          ? { ...c, cpf: action.cpf, nome: action.nome, cargo: action.cargo, departamento: action.departamento, nascimento: action.nascimento }
          : c,
      );
      return { ...state, colaboradores };
    }

    case "REINTEGRAR_COLABORADOR": {
      const { [action.colabId]: _removido, ...resto } = state.desligados;
      return { ...state, desligados: resto };
    }

    case "ADICIONAR_CARGO_MATRIZ":
      return { ...state, matrizAdd: [...state.matrizAdd, action.cargo] };

    case "REGISTRAR_FARDAMENTO_ENTREGA":
      return { ...state, fardamentoEntregas: [action.entrega, ...state.fardamentoEntregas] };

    case "REGISTRAR_FARDAMENTO_REPARO":
      return { ...state, fardamentoReparos: [action.reparo, ...state.fardamentoReparos] };

    case "EDITAR_PRECO_FARDAMENTO":
      return { ...state, fardamentoPrecos: { ...state.fardamentoPrecos, [action.tipo]: action.preco } };

    case "GERAR_FICHA_EPI": {
      // Agrupa todas as entregas do "lote aberto" (ainda sem fichaId) informadas
      // pela UI numa única ficha nova. Entregas registradas depois formam o
      // próximo lote, que virará outra ficha na próxima geração.
      const idsValidos = new Set(
        action.entregaIds.filter((id) => {
          const e = state.entregas.find((x) => x.id === id);
          return e && e.colabId === action.colabId && !e.fichaId;
        }),
      );
      if (idsValidos.size === 0) return state;
      const ficha = {
        id: action.fichaId,
        // sequencial global (nunca reaproveitado, mesmo que uma ficha antiga seja removida no futuro) —
        // calculado pelo chamador (mesmo valor já gravado no Supabase por gerarFichaEpi()).
        numero: action.numero,
        colabId: action.colabId,
        entregaIds: [...idsValidos],
        geradaEm: action.geradaEm,
        geradaPor: action.by,
      };
      return {
        ...state,
        entregas: state.entregas.map((e) => (idsValidos.has(e.id) ? { ...e, fichaId: ficha.id } : e)),
        fichasEpi: [ficha, ...state.fichasEpi],
      };
    }

    case "ANEXAR_FICHA_EPI_ASSINADA": {
      const ficha = state.fichasEpi.find((f) => f.id === action.fichaId);
      if (!ficha) return state;
      return {
        ...state,
        fichasEpi: state.fichasEpi.map((f) =>
          f.id === action.fichaId
            ? {
                ...f,
                assinaturaFileName: action.fileName,
                assinaturaStoragePath: action.storagePath,
                assinaturaMime: action.mime,
                assinaturaAnexadaEm: action.anexadaEm,
                assinaturaResponsavel: action.by,
              }
            : f,
        ),
      };
    }

    case "RESET":
      return buildInitialState();

    default:
      return state;
  }
}
