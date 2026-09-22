import { useMemo, useState } from "react";
import { History, Pencil, Plus, Wrench } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  SearchInput,
  SegmentedControl,
  Select,
  Table,
  Td,
  Th,
  THead,
  TextInput,
  Tr,
} from "../../../components/ui";
import { PriceEditModal } from "../../../components/shared/PriceEditModal";
import { useAuth } from "../../../auth/AuthContext";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { deptName, fmtMoney, titleCase } from "../../../domain/text";
import { isoToBR, parseBR, stamp } from "../../../domain/dates";
import { criarLogEntry } from "../../../domain/logEntry";
import { matchesColaboradorSearch } from "../lib/epiUtils";
import { registrarFardamentoEntrega, registrarFardamentoReparo } from "../../../repositories/fardamentoRepository";
import { editarPrecoFardamento } from "../../../repositories/precosRepository";
import { registrarLog } from "../../../repositories/logRepository";
import { FardamentoEntregaModal } from "../FardamentoEntregaModal";
import type { FardamentoEntregaPayload } from "../FardamentoEntregaModal";
import { FardamentoReparoModal } from "../FardamentoReparoModal";
import type { FardamentoReparoPayload } from "../FardamentoReparoModal";
import type { Colaborador, FardamentoEntrega, FardamentoReparo } from "../../../types/domain";
import shared from "../EpiShared.module.css";
import styles from "./FardamentoTab.module.css";

type View = "entregas" | "reparos" | "valores";

interface Filtros {
  texto: string;
  tipo: string;
  depto: string;
  de: string;
  ate: string;
}

const FILTROS_INICIAIS: Filtros = { texto: "", tipo: "", depto: "", de: "", ate: "" };

function dentroDoPeriodo(dataBR: string, de: string, ate: string): boolean {
  const d = parseBR(dataBR);
  if (!d) return true;
  if (de && d < new Date(de)) return false;
  if (ate) {
    const limite = new Date(ate);
    limite.setHours(23, 59, 59, 999);
    if (d > limite) return false;
  }
  return true;
}

export function FardamentoTab() {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [view, setView] = useState<View>("entregas");
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [showReparoModal, setShowReparoModal] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState<string | null>(null);

  const colabPorId = useMemo(() => {
    const map = new Map<number, Colaborador>();
    for (const c of state.colaboradores) map.set(c.id, c);
    return map;
  }, [state.colaboradores]);

  const ativos = useMemo(() => state.colaboradores.filter((c) => !state.desligados[c.id]), [state.colaboradores, state.desligados]);

  const tipoOptions = useMemo(() => {
    const tipos = new Set<string>(Object.keys(state.fardamentoPrecos));
    for (const e of state.fardamentoEntregas) tipos.add(e.tipo);
    return Array.from(tipos).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [state.fardamentoPrecos, state.fardamentoEntregas]);

  const deptoOptions = useMemo(() => {
    const nomes = new Set(state.colaboradores.map((c) => deptName(c.departamento)));
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [state.colaboradores]);

  const entregasFiltradas = useMemo(() => {
    return state.fardamentoEntregas
      .filter((e) => {
        const colab = colabPorId.get(e.colabId);
        if (filtros.texto && (!colab || !matchesColaboradorSearch(colab, filtros.texto))) return false;
        if (filtros.tipo && e.tipo !== filtros.tipo) return false;
        if (filtros.depto && deptName(colab?.departamento) !== filtros.depto) return false;
        if (!dentroDoPeriodo(e.dataEntrega, filtros.de, filtros.ate)) return false;
        return true;
      })
      .slice()
      .sort((a, b) => (parseBR(b.dataEntrega)?.getTime() ?? 0) - (parseBR(a.dataEntrega)?.getTime() ?? 0));
  }, [state.fardamentoEntregas, colabPorId, filtros]);

  const reparosFiltrados = useMemo(() => {
    return state.fardamentoReparos
      .filter((r) => {
        const colab = colabPorId.get(r.colabId);
        if (filtros.texto && (!colab || !matchesColaboradorSearch(colab, filtros.texto))) return false;
        if (filtros.depto && deptName(colab?.departamento) !== filtros.depto) return false;
        if (!dentroDoPeriodo(r.dataReparo, filtros.de, filtros.ate)) return false;
        return true;
      })
      .slice()
      .sort((a, b) => (parseBR(b.dataReparo)?.getTime() ?? 0) - (parseBR(a.dataReparo)?.getTime() ?? 0));
  }, [state.fardamentoReparos, colabPorId, filtros]);

  const valoresRows = useMemo(() => {
    return tipoOptions
      .filter((t) => !filtros.tipo || t === filtros.tipo)
      .map((tipo) => {
        const preco = state.fardamentoPrecos[tipo];
        const qtdEntregue = state.fardamentoEntregas.filter((e) => e.tipo === tipo).reduce((acc, e) => acc + e.qtd, 0);
        const valorUnit = preco?.valor ?? 0;
        return {
          tipo,
          valorUnit,
          fornecedor: preco?.fornecedor || "—",
          dataCotacao: preco?.dataCotacao || "—",
          historico: preco?.historico ?? [],
          qtdEntregue,
          total: valorUnit * qtdEntregue,
        };
      })
      .sort((a, b) => b.qtdEntregue - a.qtdEntregue || a.tipo.localeCompare(b.tipo, "pt-BR"));
  }, [tipoOptions, state.fardamentoPrecos, state.fardamentoEntregas, filtros.tipo]);

  const resumoEntregas = useMemo(
    () => ({
      count: entregasFiltradas.length,
      total: entregasFiltradas.reduce((acc, e) => acc + e.qtd * e.valorUnit, 0),
    }),
    [entregasFiltradas],
  );

  const resumoReparos = useMemo(
    () => ({
      count: reparosFiltrados.length,
      total: reparosFiltrados.reduce((acc, r) => acc + r.valor, 0),
    }),
    [reparosFiltrados],
  );

  function limpar() {
    setFiltros(FILTROS_INICIAIS);
  }

  async function handleNovaEntrega(payload: FardamentoEntregaPayload) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const colab = state.colaboradores.find((c) => c.id === payload.colabId);
    const result = await registrarFardamentoEntrega({ ...payload, cpf: colab?.cpf ?? "", responsavel: user.email });
    if (!result.ok) return result;
    dispatch({ type: "REGISTRAR_FARDAMENTO_ENTREGA", entrega: result.entrega });
    const entry = criarLogEntry({
      action: "Entrega de fardamento",
      colabId: payload.colabId,
      colaboradores: state.colaboradores,
      detail: payload.tipo,
      user: user.email,
      ts: result.entrega.ts,
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  async function handleNovoReparo(payload: FardamentoReparoPayload) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const colab = state.colaboradores.find((c) => c.id === payload.colabId);
    const result = await registrarFardamentoReparo({ ...payload, cpf: colab?.cpf ?? "", responsavel: user.email });
    if (!result.ok) return result;
    dispatch({ type: "REGISTRAR_FARDAMENTO_REPARO", reparo: result.reparo });
    const entry = criarLogEntry({
      action: "Reparo de fardamento",
      colabId: payload.colabId,
      colaboradores: state.colaboradores,
      detail: payload.tipoReparo,
      user: user.email,
      ts: result.reparo.ts,
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  const linhaEditando = editandoTipo ? valoresRows.find((r) => r.tipo === editandoTipo) : undefined;

  async function salvarPrecoFardamento(valor: number, fornecedor: string, dataCotacaoIso: string) {
    if (!user || !editandoTipo) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const dataCotacao = dataCotacaoIso ? isoToBR(dataCotacaoIso) : "";
    const result = await editarPrecoFardamento(editandoTipo, state.fardamentoPrecos[editandoTipo], valor, fornecedor, dataCotacao);
    if (!result.ok) return result;
    dispatch({ type: "EDITAR_PRECO_FARDAMENTO", tipo: editandoTipo, preco: result.preco });
    const entry = criarLogEntry({
      action: "Preço de fardamento atualizado",
      colabId: null,
      colaboradores: state.colaboradores,
      detail: editandoTipo,
      user: user.email,
      ts: stamp(),
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  return (
    <div className={styles.wrap}>
      <p className={shared.intro}>
        O controle de fardamento é independente da matriz de EPI: cada entrega e cada reparo geram um registro próprio, que nunca é
        sobrescrito por um lançamento posterior — preservando o histórico completo de uso e manutenção de cada peça.
      </p>

      <Card className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <SearchInput
            placeholder="Colaborador ou CPF..."
            value={filtros.texto}
            onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
          />
          <Select
            options={[{ value: "", label: "Todos os tipos" }, ...tipoOptions.map((o) => ({ value: o, label: o }))]}
            value={filtros.tipo}
            onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
          />
          <Select
            options={[{ value: "", label: "Todos os departamentos" }, ...deptoOptions.map((o) => ({ value: o, label: o }))]}
            value={filtros.depto}
            onChange={(e) => setFiltros((f) => ({ ...f, depto: e.target.value }))}
          />
          <TextInput type="date" value={filtros.de} onChange={(e) => setFiltros((f) => ({ ...f, de: e.target.value }))} />
          <TextInput type="date" value={filtros.ate} onChange={(e) => setFiltros((f) => ({ ...f, ate: e.target.value }))} />
          <button type="button" className={styles.clearButton} onClick={limpar}>
            Limpar
          </button>
        </div>
      </Card>

      <div className={shared.toolbar}>
        <SegmentedControl
          items={[
            { key: "entregas", label: "Entregas" },
            { key: "reparos", label: "Reparos" },
            { key: "valores", label: "Valores" },
          ]}
          active={view}
          onChange={(k) => setView(k as View)}
        />
        {canEdit ? (
          <div className={shared.toolbarRight}>
            <Button variant="secondary" onClick={() => setShowReparoModal(true)}>
              <Wrench size={14} /> Novo reparo
            </Button>
            <Button onClick={() => setShowEntregaModal(true)}>
              <Plus size={14} /> Nova entrega
            </Button>
          </div>
        ) : null}
      </div>

      {view === "entregas" ? (
        <>
          <div className={shared.chipsRow}>
            <div className={shared.chip}>
              <div className={shared.chipLabel}>Entregas</div>
              <div className={shared.chipValue}>{resumoEntregas.count}</div>
            </div>
            <div className={shared.chip}>
              <div className={shared.chipLabel}>Valor total</div>
              <div className={shared.chipValue}>{fmtMoney(resumoEntregas.total)}</div>
            </div>
          </div>
          <Card>
            {entregasFiltradas.length === 0 ? (
              <EmptyState title="Nenhuma entrega de fardamento encontrada" description="Ajuste os filtros ou registre uma nova entrega." />
            ) : (
              <Table>
                <THead>
                  <Th>Entrega</Th>
                  <Th>Colaborador</Th>
                  <Th>Tipo</Th>
                  <Th>Qtd</Th>
                  <Th>Tam.</Th>
                  <Th>V. unit.</Th>
                  <Th>V. total</Th>
                  <Th>Fornecedor</Th>
                  <Th>Responsável</Th>
                </THead>
                <tbody>
                  {entregasFiltradas.map((e) => (
                    <EntregaRow key={e.id} entrega={e} colab={colabPorId.get(e.colabId)} />
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      ) : null}

      {view === "reparos" ? (
        <>
          <div className={shared.chipsRow}>
            <div className={shared.chip}>
              <div className={shared.chipLabel}>Reparos</div>
              <div className={shared.chipValue}>{resumoReparos.count}</div>
            </div>
            <div className={shared.chip}>
              <div className={shared.chipLabel}>Valor total</div>
              <div className={styles.chipValueAmber}>{fmtMoney(resumoReparos.total)}</div>
            </div>
          </div>
          <Card>
            {reparosFiltrados.length === 0 ? (
              <EmptyState title="Nenhum reparo de fardamento encontrado" description="Ajuste os filtros ou registre um novo reparo." />
            ) : (
              <Table>
                <THead>
                  <Th>Data</Th>
                  <Th>Colaborador</Th>
                  <Th>Peça</Th>
                  <Th>Tipo de reparo</Th>
                  <Th>Valor</Th>
                  <Th>Prestador</Th>
                  <Th>Responsável</Th>
                </THead>
                <tbody>
                  {reparosFiltrados.map((r) => (
                    <ReparoRow key={r.id} reparo={r} colab={colabPorId.get(r.colabId)} />
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      ) : null}

      {view === "valores" ? (
        <Card>
          {valoresRows.length === 0 ? (
            <EmptyState title="Nenhum tipo de fardamento cadastrado" />
          ) : (
            <Table>
              <THead>
                <Th>Tipo</Th>
                <Th>Qtd. entregue</Th>
                <Th>Valor unit.</Th>
                <Th>Fornecedor</Th>
                <Th>Cotação</Th>
                <Th>Total entregue</Th>
                {canEdit ? <Th>Ações</Th> : null}
              </THead>
              <tbody>
                {valoresRows.map((r) => (
                  <Tr key={r.tipo}>
                    <Td>
                      <div className={styles.equipCell}>
                        <strong>{r.tipo}</strong>
                        {r.historico.length > 0 ? (
                          <span className={styles.historyPill}>
                            <History size={11} /> {r.historico.length}
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    <Td>{r.qtdEntregue}</Td>
                    <Td mono>{fmtMoney(r.valorUnit)}</Td>
                    <Td>{r.fornecedor}</Td>
                    <Td mono>{r.dataCotacao}</Td>
                    <Td mono>
                      <strong>{fmtMoney(r.total)}</strong>
                    </Td>
                    {canEdit ? (
                      <Td>
                        <Button variant="ghost" onClick={() => setEditandoTipo(r.tipo)}>
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
      ) : null}

      {showEntregaModal ? (
        <FardamentoEntregaModal
          colaboradores={ativos}
          tipoOptions={tipoOptions}
          fardamentoPrecos={state.fardamentoPrecos}
          onClose={() => setShowEntregaModal(false)}
          onSave={handleNovaEntrega}
        />
      ) : null}

      {showReparoModal ? (
        <FardamentoReparoModal colaboradores={ativos} onClose={() => setShowReparoModal(false)} onSave={handleNovoReparo} />
      ) : null}

      {linhaEditando ? (
        <PriceEditModal
          title="Editar valor de fardamento"
          itemLabel={linhaEditando.tipo}
          valor={linhaEditando.valorUnit}
          fornecedor={linhaEditando.fornecedor === "—" ? "" : linhaEditando.fornecedor}
          dataCotacao={linhaEditando.dataCotacao === "—" ? "" : linhaEditando.dataCotacao}
          historico={linhaEditando.historico}
          onClose={() => setEditandoTipo(null)}
          onSave={salvarPrecoFardamento}
        />
      ) : null}
    </div>
  );
}

function EntregaRow({ entrega, colab }: { entrega: FardamentoEntrega; colab: Colaborador | undefined }) {
  return (
    <Tr>
      <Td mono>{entrega.dataEntrega}</Td>
      <Td>
        <div className={styles.colabCell}>
          <strong>{colab ? titleCase(colab.nome) : "Colaborador removido"}</strong>
          <span>{deptName(colab?.departamento)}</span>
        </div>
      </Td>
      <Td>{entrega.tipo}</Td>
      <Td>{entrega.qtd}</Td>
      <Td>{entrega.tamanho || "—"}</Td>
      <Td mono>{fmtMoney(entrega.valorUnit)}</Td>
      <Td mono>
        <strong>{fmtMoney(entrega.qtd * entrega.valorUnit)}</strong>
      </Td>
      <Td>{entrega.fornecedor || "—"}</Td>
      <Td>{entrega.responsavel}</Td>
    </Tr>
  );
}

function ReparoRow({ reparo, colab }: { reparo: FardamentoReparo; colab: Colaborador | undefined }) {
  return (
    <Tr>
      <Td mono>{reparo.dataReparo}</Td>
      <Td>
        <div className={styles.colabCell}>
          <strong>{colab ? titleCase(colab.nome) : "Colaborador removido"}</strong>
          <span>{deptName(colab?.departamento)}</span>
        </div>
      </Td>
      <Td>{reparo.peca}</Td>
      <Td>{reparo.tipoReparo}</Td>
      <Td mono>
        <span className={styles.valorAmber}>{fmtMoney(reparo.valor)}</span>
      </Td>
      <Td>{reparo.fornecedor || "—"}</Td>
      <Td>{reparo.responsavel}</Td>
    </Tr>
  );
}
