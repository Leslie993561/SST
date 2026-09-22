import { useMemo, useState } from "react";
import { History, Pencil, Plus } from "lucide-react";
import { Button, Card, EmptyState, ProgressBar, Table, Td, Th, THead, Tr } from "../../../components/ui";
import { PriceEditModal } from "../../../components/shared/PriceEditModal";
import { AdicionarEpiModal } from "../AdicionarEpiModal";
import { useAuth } from "../../../auth/AuthContext";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { portalRepository } from "../../../repositories/portalRepository";
import { fmtMoney } from "../../../domain/text";
import { isoToBR, stamp } from "../../../domain/dates";
import { criarLogEntry } from "../../../domain/logEntry";
import { demandaPorEquip } from "../lib/epiUtils";
import { editarPrecoEpi } from "../../../repositories/precosRepository";
import { registrarLog } from "../../../repositories/logRepository";
import shared from "../EpiShared.module.css";
import styles from "./CustosTab.module.css";

interface LinhaCusto {
  equip: string;
  valorUnit: number;
  fornecedor: string;
  dataCotacao: string;
  historicoCount: number;
  historico: { valor: number; fornecedor: string; dataCotacao: string; ts: string }[];
  demanda: number;
  custo: number;
}

export function CustosTab() {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [editando, setEditando] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);

  const catalogo = useMemo(() => portalRepository.getEpiCatalogo(), []);
  const matrizEpi = useMemo(() => portalRepository.getMatrizEpi(), []);
  const ativos = useMemo(() => state.colaboradores.filter((c) => !state.desligados[c.id]), [state.colaboradores, state.desligados]);
  const demandMap = useMemo(() => demandaPorEquip(ativos, matrizEpi), [ativos, matrizEpi]);

  const linhas = useMemo<LinhaCusto[]>(() => {
    const catalogNames = new Set(catalogo.map((c) => c.equip));
    const extras = Object.keys(state.epiPrecos).filter((k) => !catalogNames.has(k));
    const equipsBase = [...catalogo.map((c) => ({ equip: c.equip, catalogValor: c.valor })), ...extras.map((k) => ({ equip: k, catalogValor: undefined as number | undefined }))];

    return equipsBase
      .map(({ equip, catalogValor }) => {
        const preco = state.epiPrecos[equip];
        const valorUnit = preco?.valor ?? catalogValor ?? 0;
        const demanda = demandMap.get(equip) ?? 0;
        return {
          equip,
          valorUnit,
          fornecedor: preco?.fornecedor || "—",
          dataCotacao: preco?.dataCotacao || "—",
          historicoCount: preco?.historico.length ?? 0,
          historico: preco?.historico ?? [],
          demanda,
          custo: valorUnit * demanda,
        };
      })
      .sort((a, b) => b.demanda - a.demanda || a.equip.localeCompare(b.equip, "pt-BR"));
  }, [catalogo, state.epiPrecos, demandMap]);

  const totalCusto = useMemo(() => linhas.reduce((acc, l) => acc + l.custo, 0), [linhas]);
  const maxDemanda = useMemo(() => Math.max(1, ...linhas.map((l) => l.demanda)), [linhas]);

  const linhaEditando = editando ? linhas.find((l) => l.equip === editando) : undefined;

  async function salvarPreco(valor: number, fornecedor: string, dataCotacaoIso: string) {
    if (!user || !editando) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const dataCotacao = dataCotacaoIso ? isoToBR(dataCotacaoIso) : "";
    const result = await editarPrecoEpi(editando, state.epiPrecos[editando], valor, fornecedor, dataCotacao);
    if (!result.ok) return result;
    dispatch({ type: "EDITAR_PRECO_EPI", equip: editando, preco: result.preco });
    const entry = criarLogEntry({
      action: "Preço de EPI atualizado",
      colabId: null,
      colaboradores: state.colaboradores,
      detail: editando,
      user: user.email,
      ts: stamp(),
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  async function adicionarEpi(equip: string, valor: number, fornecedor: string, dataCotacaoIso: string) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const dataCotacao = dataCotacaoIso ? isoToBR(dataCotacaoIso) : "";
    const result = await editarPrecoEpi(equip, state.epiPrecos[equip], valor, fornecedor, dataCotacao);
    if (!result.ok) return result;
    dispatch({ type: "EDITAR_PRECO_EPI", equip, preco: result.preco });
    const entry = criarLogEntry({
      action: "Preço de EPI atualizado",
      colabId: null,
      colaboradores: state.colaboradores,
      detail: equip,
      user: user.email,
      ts: stamp(),
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <p className={shared.intro}>
          Os valores unitários de cada EPI são editáveis pelo RH e mantêm histórico de cotações. A demanda é calculada a partir da matriz de
          EPI por função — cada colaborador ativo soma 1 à demanda de todo equipamento obrigatório para sua função. O custo estimado é o
          produto entre o valor unitário vigente e a demanda.
        </p>
        {canEdit ? (
          <Button onClick={() => setAdicionando(true)}>
            <Plus size={15} /> Adicionar EPI
          </Button>
        ) : null}
      </div>

      <div className={shared.chipsRow}>
        <div className={shared.chip}>
          <div className={shared.chipLabel}>Custo total estimado</div>
          <div className={shared.chipValue}>{fmtMoney(totalCusto)}</div>
        </div>
        <div className={shared.chip}>
          <div className={shared.chipLabel}>Itens no catálogo</div>
          <div className={shared.chipValue}>{linhas.length}</div>
        </div>
      </div>

      <Card>
        {linhas.length === 0 ? (
          <EmptyState title="Nenhum item de EPI cadastrado" />
        ) : (
          <Table>
            <THead>
              <Th>Equipamento</Th>
              <Th>Demanda</Th>
              <Th>Valor unit.</Th>
              <Th>Fornecedor</Th>
              <Th>Cotação</Th>
              <Th>Custo estimado</Th>
              <Th>Participação</Th>
              {canEdit ? <Th>Ações</Th> : null}
            </THead>
            <tbody>
              {linhas.map((l) => (
                <Tr key={l.equip}>
                  <Td>
                    <div className={styles.equipCell}>
                      <strong>{l.equip}</strong>
                      {l.historicoCount > 0 ? (
                        <span className={styles.historyPill}>
                          <History size={11} /> {l.historicoCount}
                        </span>
                      ) : null}
                    </div>
                  </Td>
                  <Td>{l.demanda}</Td>
                  <Td mono>{fmtMoney(l.valorUnit)}</Td>
                  <Td>{l.fornecedor}</Td>
                  <Td mono>{l.dataCotacao}</Td>
                  <Td mono>
                    <strong>{fmtMoney(l.custo)}</strong>
                  </Td>
                  <Td>
                    <div className={styles.progressCell}>
                      <ProgressBar percent={(l.demanda / maxDemanda) * 100} />
                    </div>
                  </Td>
                  {canEdit ? (
                    <Td>
                      <Button variant="ghost" onClick={() => setEditando(l.equip)}>
                        <Pencil size={13} /> Editar valor
                      </Button>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {linhaEditando ? (
        <PriceEditModal
          title="Editar valor de EPI"
          itemLabel={linhaEditando.equip}
          valor={linhaEditando.valorUnit}
          fornecedor={linhaEditando.fornecedor === "—" ? "" : linhaEditando.fornecedor}
          dataCotacao={linhaEditando.dataCotacao === "—" ? "" : linhaEditando.dataCotacao}
          historico={linhaEditando.historico}
          onClose={() => setEditando(null)}
          onSave={salvarPreco}
        />
      ) : null}

      {adicionando ? (
        <AdicionarEpiModal
          nomesExistentes={linhas.map((l) => l.equip)}
          onClose={() => setAdicionando(false)}
          onSave={adicionarEpi}
        />
      ) : null}
    </div>
  );
}
