import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { colaboradoresRepository } from "../repositories/colaboradoresRepository";
import { getDesligamentosPendentes } from "../repositories/desligamentoPendenteRepository";
import { getAsoDemissionalPendentes } from "../repositories/asoDemissionalPendenteRepository";
import { getAnexosExames } from "../repositories/anexosExamesRepository";
import { getEntregasEpi, getFichasEpi } from "../repositories/fichasEpiRepository";
import { getFardamentoEntregas, getFardamentoReparos } from "../repositories/fardamentoRepository";
import { getEpiPrecos, getExamePrecos, getFardamentoPrecos } from "../repositories/precosRepository";
import { getMatrizAddCargos } from "../repositories/matrizAddRepository";
import { getProgramasSaude } from "../repositories/programasSaudeRepository";
import { getCustosEpiMes, getCustosFardamentoMes } from "../repositories/custosRepository";
import { getLog } from "../repositories/logRepository";
import type { PortalAction } from "./actions";
import { portalReducer } from "./reducer";
import { buildInitialState, defaultEpiPrecos, defaultExamePrecos, defaultFardamentoPrecos } from "./seed";
import type { PortalState } from "./types";

const STORAGE_KEY = "msb_sst_portal_v1";

function loadPersisted(): PortalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PortalState>;
      if (Array.isArray(parsed.colaboradores)) return { ...buildInitialState(), ...parsed };
    }
  } catch {
    // localStorage indisponível ou payload corrompido — segue com o estado semente.
  }
  return buildInitialState();
}

interface PortalStoreValue {
  state: PortalState;
  dispatch: (action: PortalAction) => void;
  colaboradoresLoading: boolean;
  colaboradoresError: string | null;
}

const PortalStoreContext = createContext<PortalStoreValue | null>(null);

export function PortalStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(portalReducer, undefined, loadPersisted);
  const [colaboradoresLoading, setColaboradoresLoading] = useState(false);
  const [colaboradoresError, setColaboradoresError] = useState<string | null>(null);

  // Carrega a base de colaboradores do Supabase assim que há uma sessão
  // autenticada (RLS só libera SELECT para `authenticated`); ao deslogar,
  // zera tudo — nenhum dado pessoal deve sobrar em memória/localStorage.
  useEffect(() => {
    if (!user) {
      dispatch({ type: "RESET" });
      setColaboradoresError(null);
      setColaboradoresLoading(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignora
      }
      return;
    }
    let cancelado = false;
    setColaboradoresLoading(true);
    setColaboradoresError(null);
    colaboradoresRepository
      .getColaboradores()
      .then((colaboradores) => {
        if (cancelado) return;
        dispatch({ type: "SET_COLABORADORES", colaboradores });
      })
      .catch((err: Error) => {
        if (cancelado) return;
        setColaboradoresError(err.message);
      })
      .finally(() => {
        if (!cancelado) setColaboradoresLoading(false);
      });
    getDesligamentosPendentes()
      .then((desligamentosPendentes) => {
        if (cancelado) return;
        dispatch({ type: "SET_DESLIGAMENTOS_PENDENTES", desligamentosPendentes });
      })
      .catch(() => {
        // notificação não-crítica — se falhar, o Dashboard só fica sem o aviso desta vez.
      });
    getAsoDemissionalPendentes()
      .then((pendentes) => {
        if (cancelado) return;
        dispatch({ type: "SET_ASO_DEMISSIONAL_PENDENTES", pendentes });
      })
      .catch(() => {
        // notificação não-crítica — se falhar, o Dashboard só fica sem o aviso desta vez.
      });
    // Entregas/fichas de EPI e anexos de exame agora vêm do Supabase (ver
    // anexosExamesRepository.ts / fichasEpiRepository.ts) — se uma dessas
    // cargas falhar, as telas de EPI/exames só ficam vazias desta vez; não
    // impede o resto do app de funcionar.
    getEntregasEpi()
      .then((entregas) => {
        if (cancelado) return;
        dispatch({ type: "SET_ENTREGAS_EPI", entregas });
      })
      .catch(() => {});
    getFichasEpi()
      .then((fichasEpi) => {
        if (cancelado) return;
        dispatch({ type: "SET_FICHAS_EPI", fichasEpi });
      })
      .catch(() => {});
    getAnexosExames()
      .then((attachments) => {
        if (cancelado) return;
        dispatch({ type: "SET_ANEXOS_EXAMES", attachments });
      })
      .catch(() => {});
    // Fardamento, preços, matriz adicionada, custos e log — mesma ideia acima,
    // antes só existiam em localStorage (ver README para o histórico da
    // migração). Cada carga é independente; uma falha isolada não derruba o
    // resto do app.
    getFardamentoEntregas()
      .then((fardamentoEntregas) => {
        if (cancelado) return;
        dispatch({ type: "SET_FARDAMENTO_ENTREGAS", fardamentoEntregas });
      })
      .catch(() => {});
    getFardamentoReparos()
      .then((fardamentoReparos) => {
        if (cancelado) return;
        dispatch({ type: "SET_FARDAMENTO_REPAROS", fardamentoReparos });
      })
      .catch(() => {});
    // Preços: mescla o catálogo estático (valor "de fábrica") com o que o RH
    // já editou no Supabase — uma chave nunca editada continua mostrando o
    // valor padrão em vez de sumir do catálogo.
    getEpiPrecos()
      .then((doSupabase) => {
        if (cancelado) return;
        dispatch({ type: "SET_EPI_PRECOS", epiPrecos: { ...defaultEpiPrecos(), ...doSupabase } });
      })
      .catch(() => {});
    getExamePrecos()
      .then((doSupabase) => {
        if (cancelado) return;
        dispatch({ type: "SET_EXAME_PRECOS", examePrecos: { ...defaultExamePrecos(), ...doSupabase } });
      })
      .catch(() => {});
    getFardamentoPrecos()
      .then((doSupabase) => {
        if (cancelado) return;
        dispatch({ type: "SET_FARDAMENTO_PRECOS", fardamentoPrecos: { ...defaultFardamentoPrecos(), ...doSupabase } });
      })
      .catch(() => {});
    getMatrizAddCargos()
      .then((matrizAdd) => {
        if (cancelado) return;
        dispatch({ type: "SET_MATRIZ_ADD", matrizAdd });
      })
      .catch(() => {});
    getProgramasSaude()
      .then((programasSaude) => {
        if (cancelado) return;
        dispatch({ type: "SET_PROGRAMAS_SAUDE", programasSaude });
      })
      .catch(() => {});
    getCustosEpiMes()
      .then((custosEpi) => {
        if (cancelado) return;
        dispatch({ type: "SET_CUSTOS_EPI", custosEpi });
      })
      .catch(() => {});
    getCustosFardamentoMes()
      .then((custosFardamento) => {
        if (cancelado) return;
        dispatch({ type: "SET_CUSTOS_FARDAMENTO", custosFardamento });
      })
      .catch(() => {});
    getLog()
      .then((log) => {
        if (cancelado) return;
        dispatch({ type: "SET_LOG", log });
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return; // nada para persistir quando deslogado (ver efeito acima)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // armazenamento cheio ou bloqueado — segue apenas em memória nesta sessão.
    }
  }, [state, user]);

  const value = useMemo(
    () => ({ state, dispatch, colaboradoresLoading, colaboradoresError }),
    [state, colaboradoresLoading, colaboradoresError],
  );
  return <PortalStoreContext.Provider value={value}>{children}</PortalStoreContext.Provider>;
}

export function usePortalStore(): PortalStoreValue {
  const ctx = useContext(PortalStoreContext);
  if (!ctx) throw new Error("usePortalStore precisa ser usado dentro de <PortalStoreProvider>");
  return ctx;
}
