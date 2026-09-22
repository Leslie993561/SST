import { useMemo, useState } from "react";
import { Paperclip, Plus, TriangleAlert } from "lucide-react";
import { Avatar, Button, Card, EmptyState, SearchInput, Select, StatusBadge, Table, Td, Th, THead, Tr } from "../../../components/ui";
import { useAuth } from "../../../auth/AuthContext";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { portalRepository } from "../../../repositories/portalRepository";
import { statusDoRegistro, statusGeralFor, toneForStatus } from "../../../domain/exameStatus";
import { deptName, iniciais, titleCase } from "../../../domain/text";
import { idadeFromISO } from "../../../domain/dates";
import { ativosDe, temAlertaIdade, todosOsCargos } from "../lib/exameUtils";
import { ExameFichaDrawer } from "../ExameFichaDrawer";
import { AnexarExameModal } from "../AnexarExameModal";
import type { AnexarExamePayload } from "../AnexarExameModal";
import { anexarExame } from "../../../repositories/anexosExamesRepository";
import { registrarLog } from "../../../repositories/logRepository";
import { criarLogEntry } from "../../../domain/logEntry";
import shared from "../ExamesShared.module.css";
import styles from "./ControleTab.module.css";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "Em dia", label: "Em dia" },
  { value: "A vencer", label: "A vencer" },
  { value: "Vencido", label: "Vencido" },
  { value: "Necessita revisão", label: "Necessita revisão" },
  { value: "Pendente", label: "Pendente (sem realização)" },
];

interface AnexarState {
  colabId?: number;
}

export function ControleTab() {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedColabId, setSelectedColabId] = useState<number | null>(null);
  const [anexarState, setAnexarState] = useState<AnexarState | null>(null);

  const cargosOcupacionais = useMemo(
    () => todosOsCargos(portalRepository.getMatrizOcupacional().cargos, state.matrizAdd),
    [state.matrizAdd],
  );
  const catalogoExames = useMemo(() => portalRepository.getMatrizOcupacional().catalogoExames, []);

  const ativos = useMemo(() => ativosDe(state.colaboradores, state.desligados), [state.colaboradores, state.desligados]);

  const linhas = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return ativos
      .filter((c) => (termo ? c.nome.toLowerCase().includes(termo) : true))
      .filter((c) =>
        statusFilter
          ? statusGeralFor(c.exames, new Date(), { idadeColab: idadeFromISO(c.nascimento), catalogo: catalogoExames }) === statusFilter
          : true,
      )
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [ativos, search, statusFilter, catalogoExames]);

  async function handleAnexar(payload: AnexarExamePayload) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await anexarExame({
      colabId: payload.colabId,
      proc: payload.proc,
      dataISO: payload.dataISO,
      proximo: payload.proximo,
      fornecedor: payload.fornecedor,
      valor: payload.valor,
      file: payload.file,
      by: user.email,
    });
    if (!result.ok) return result;
    dispatch({ type: "ANEXAR_EXAME", anexo: result.anexo, proximo: payload.proximo });
    const entry = criarLogEntry({
      action: "Exame anexado",
      colabId: payload.colabId,
      colaboradores: state.colaboradores,
      detail: payload.proc,
      user: user.email,
      ts: result.anexo.ts,
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.toolbarCard}>
        <div className={shared.toolbar}>
          <div className={shared.toolbarLeft}>
            <SearchInput placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
          </div>
          {canEdit ? (
            <div className={shared.toolbarRight}>
              <Button onClick={() => setAnexarState({})}>
                <Plus size={15} /> Anexar exame
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        {linhas.length === 0 ? (
          <EmptyState title="Nenhum colaborador encontrado" description="Ajuste a busca ou o filtro de status." />
        ) : (
          <Table>
            <THead>
              <Th>Colaborador</Th>
              <Th>Cargo</Th>
              <Th>Departamento</Th>
              <Th>Idade</Th>
              <Th>Previstos</Th>
              <Th>Realizados</Th>
              <Th>Status geral</Th>
              <Th>Ações</Th>
            </THead>
            <tbody>
              {linhas.map((c) => {
                const idade = idadeFromISO(c.nascimento);
                const contextoIdade = { idadeColab: idade, catalogo: catalogoExames };
                const alerta = temAlertaIdade(c, catalogoExames);
                const previstos = c.exames.length;
                const realizados = c.exames.filter((e) => e.ultimo && e.ultimo !== "—").length;
                const pendentesNunca = c.exames.filter((e) => statusDoRegistro(e, new Date(), contextoIdade) === "Pendente").length;
                const geral = statusGeralFor(c.exames, new Date(), contextoIdade);
                return (
                  <Tr key={c.id}>
                    <Td>
                      <button type="button" className={styles.colabButton} onClick={() => setSelectedColabId(c.id)}>
                        <Avatar iniciais={iniciais(c.nome)} size={32} />
                        <span className={shared.colabName}>{titleCase(c.nome)}</span>
                      </button>
                    </Td>
                    <Td>{c.cargo ? titleCase(c.cargo) : "—"}</Td>
                    <Td>{deptName(c.departamento)}</Td>
                    <Td>
                      <div className={styles.idadeCell}>
                        {idade != null ? `${idade} anos` : "—"}
                        {alerta ? (
                          <span title="Idade elegível para exame ainda não realizado">
                            <TriangleAlert size={13} color="var(--color-warning)" />
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    <Td>{previstos}</Td>
                    <Td>
                      {realizados}
                      {pendentesNunca > 0 ? <span className={styles.pendCount}>{pendentesNunca} pend.</span> : null}
                    </Td>
                    <Td>
                      <StatusBadge label={geral} tone={toneForStatus(geral)} />
                    </Td>
                    <Td>
                      <div className={styles.acoesCell}>
                        {canEdit ? (
                          <button type="button" className={shared.iconButton} title="Anexar exame" onClick={() => setAnexarState({ colabId: c.id })}>
                            <Paperclip size={13} />
                          </button>
                        ) : null}
                        <button type="button" className={shared.linkButton} onClick={() => setSelectedColabId(c.id)}>
                          Ficha
                        </button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <div className={shared.footerNote}>
        {linhas.length} de {ativos.length} colaborador{ativos.length === 1 ? "" : "es"} ativo{ativos.length === 1 ? "" : "s"}
      </div>

      {selectedColabId != null ? <ExameFichaDrawer colabId={selectedColabId} onClose={() => setSelectedColabId(null)} /> : null}

      {anexarState ? (
        <AnexarExameModal
          colaboradores={ativos}
          cargosOcupacionais={cargosOcupacionais}
          examePrecos={state.examePrecos}
          initialColabId={anexarState.colabId}
          onClose={() => setAnexarState(null)}
          onSave={handleAnexar}
        />
      ) : null}
    </div>
  );
}
