import { useMemo, useState } from "react";
import { CircleCheck, FileCheck2, FileDown, Pencil, PackagePlus, Trash2, TriangleAlert } from "lucide-react";
import { Avatar, Button, Drawer } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { usePortalStore } from "../../store/PortalStoreContext";
import { portalRepository } from "../../repositories/portalRepository";
import { deptName, fmtMoney, iniciais, maskCpf, titleCase } from "../../domain/text";
import { idadeFromISO, isoToBR, stamp } from "../../domain/dates";
import { matrizEpiParaColaborador } from "../../domain/matriz";
import { baixarFichaEntregaEpiPdf } from "../../domain/pdf/fichaEntregaEpi";
import { codigoFichaEpi, statusFichaEpi } from "../../domain/fichaAssinatura";
import { divergenciaEpiPara } from "./lib/epiUtils";
import { RegistrarEntregaEpiModal } from "./RegistrarEntregaEpiModal";
import type { RegistrarEntregaEpiPayload } from "./RegistrarEntregaEpiModal";
import { ExcluirEntregaEpiModal } from "./ExcluirEntregaEpiModal";
import { FichaEpiControls } from "./FichaEpiControls";
import { FichasAssinadasModal } from "./FichasAssinadasModal";
import { uid } from "../../store/seed";
import {
  anexarAssinaturaFicha,
  editarEntregaEpi,
  excluirEntregaEpi,
  gerarFichaEpi,
  registrarEntregaEpi,
} from "../../repositories/fichasEpiRepository";
import { registrarLog } from "../../repositories/logRepository";
import { criarLogEntry } from "../../domain/logEntry";
import type { EntregaEpi } from "../../types/domain";
import styles from "./EpiFichaDrawer.module.css";

interface EpiFichaDrawerProps {
  colabId: number;
  onClose: () => void;
}

export function EpiFichaDrawer({ colabId, onClose }: EpiFichaDrawerProps) {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [entregaEmEdicao, setEntregaEmEdicao] = useState<EntregaEpi | null>(null);
  const [entregaParaExcluir, setEntregaParaExcluir] = useState<EntregaEpi | null>(null);
  const [showFichasAssinadas, setShowFichasAssinadas] = useState(false);
  const [erroFicha, setErroFicha] = useState<string | null>(null);

  const colaborador = state.colaboradores.find((c) => c.id === colabId);
  const matrizEpi = useMemo(() => portalRepository.getMatrizEpi(), []);
  const epiCatalogo = useMemo(() => portalRepository.getEpiCatalogo(), []);

  const entregas = useMemo(
    () =>
      state.entregas
        .filter((e) => e.colabId === colabId)
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts)),
    [state.entregas, colabId],
  );

  const entregasAbertas = useMemo(() => entregas.filter((e) => !e.fichaId), [entregas]);

  const fichasDoColab = useMemo(
    () =>
      state.fichasEpi
        .filter((f) => f.colabId === colabId)
        .slice()
        .sort((a, b) => b.geradaEm.localeCompare(a.geradaEm)),
    [state.fichasEpi, colabId],
  );

  const fichasAssinadas = useMemo(() => fichasDoColab.filter((f) => statusFichaEpi(f) === "assinada"), [fichasDoColab]);

  if (!colaborador) {
    return (
      <Drawer title="Ficha do colaborador" onClose={onClose}>
        <div className={styles.notFound}>Colaborador não encontrado.</div>
      </Drawer>
    );
  }

  const mandatorios = matrizEpiParaColaborador(colaborador, matrizEpi);
  const divergencia = divergenciaEpiPara(colaborador, matrizEpi, state.entregas);
  const idade = idadeFromISO(colaborador.nascimento);

  async function handleRegistrarEntrega(payload: RegistrarEntregaEpiPayload) {
    if (!user || !colaborador) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await registrarEntregaEpi({
      colabId,
      cpf: colaborador.cpf,
      epi: payload.epi,
      qtd: payload.qtd,
      ca: payload.ca,
      fornecedor: payload.fornecedor,
      valorUnit: payload.valorUnit,
      dataEntrega: payload.dataEntrega,
      dataTroca: payload.dataTroca,
      obs: payload.obs,
      responsavel: user.email,
      assinatura: titleCase(colaborador.nome),
    });
    if (!result.ok) return result;
    dispatch({ type: "REGISTRAR_ENTREGA_EPI", entrega: result.entrega });
    const entry = criarLogEntry({
      action: "Entrega de EPI",
      colabId,
      colaboradores: state.colaboradores,
      detail: payload.epi,
      user: user.email,
      ts: result.entrega.ts,
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  async function handleEditarEntrega(entregaId: string, payload: RegistrarEntregaEpiPayload) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await editarEntregaEpi(entregaId, payload);
    if (!result.ok) return result;
    dispatch({
      type: "EDITAR_ENTREGA_EPI",
      entregaId,
      epi: payload.epi,
      qtd: payload.qtd,
      ca: payload.ca,
      fornecedor: payload.fornecedor,
      valorUnit: payload.valorUnit,
      dataEntrega: payload.dataEntrega,
      dataTroca: payload.dataTroca,
      obs: payload.obs,
    });
    const entry = criarLogEntry({
      action: "Entrega de EPI editada",
      colabId,
      colaboradores: state.colaboradores,
      detail: payload.epi,
      user: user.email,
      ts: stamp(),
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  async function handleExcluirEntrega(entregaId: string) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const entregaAtual = entregas.find((e) => e.id === entregaId);
    const result = await excluirEntregaEpi(entregaId);
    if (!result.ok) return result;
    dispatch({ type: "EXCLUIR_ENTREGA_EPI", entregaId });
    const entry = criarLogEntry({
      action: "Entrega de EPI excluída",
      colabId,
      colaboradores: state.colaboradores,
      detail: entregaAtual?.epi ?? "",
      user: user.email,
      ts: stamp(),
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  async function handleGerarFicha() {
    if (!user || !colaborador || entregasAbertas.length === 0) return;
    setErroFicha(null);
    const fichaId = uid("F");
    // mesmo cálculo sequencial que o reducer usa — seguro porque parte do
    // state atual, dentro do mesmo clique síncrono (concorrência entre RH
    // diferentes gerando fichas ao mesmo tempo é um risco aceito, mesmo do
    // esquema anterior 100% local).
    const numero = state.fichasEpi.length + 1;
    const entregaIds = entregasAbertas.map((e) => e.id);
    const result = await gerarFichaEpi({ fichaId, colabId, numero, entregaIds, geradaPor: user.email });
    if (!result.ok) {
      setErroFicha(result.error);
      return;
    }
    baixarFichaEntregaEpiPdf(entregasAbertas, colaborador, { id: fichaId, numero, geradaEm: result.geradaEm, geradaPor: user.email });
    dispatch({ type: "GERAR_FICHA_EPI", fichaId, numero, colabId, entregaIds, geradaEm: result.geradaEm, by: user.email });
    const entry = criarLogEntry({
      action: "Ficha de entrega de EPI gerada",
      colabId,
      colaboradores: state.colaboradores,
      detail: `${entregaIds.length} item(ns)`,
      user: user.email,
      ts: result.geradaEm,
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
  }

  async function handleAnexarAssinatura(fichaId: string, file: File) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const ficha = state.fichasEpi.find((f) => f.id === fichaId);
    const result = await anexarAssinaturaFicha(fichaId, file, user.email);
    if (!result.ok) return result;
    dispatch({
      type: "ANEXAR_FICHA_EPI_ASSINADA",
      fichaId,
      fileName: file.name,
      storagePath: result.storagePath,
      mime: file.type,
      anexadaEm: result.anexadaEm,
      by: user.email,
    });
    const entry = criarLogEntry({
      action: "Ficha de EPI assinada anexada",
      colabId: ficha?.colabId ?? colabId,
      colaboradores: state.colaboradores,
      detail: `${ficha?.entregaIds.length ?? 0} item(ns)`,
      user: user.email,
      ts: result.anexadaEm,
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  function renderEntregaCard(e: EntregaEpi, editable: boolean) {
    return (
      <div key={e.id} className={styles.entregaCard}>
        <div className={styles.entregaHeader}>
          <strong>{e.epi}</strong>
          <div className={styles.entregaHeaderRight}>
            <span className="mono">{e.dataEntrega}</span>
            {editable ? (
              <>
                <button type="button" className={styles.entregaIconButton} title="Editar entrega" onClick={() => setEntregaEmEdicao(e)}>
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className={`${styles.entregaIconButton} ${styles.entregaIconButtonDanger}`}
                  title="Excluir entrega"
                  onClick={() => setEntregaParaExcluir(e)}
                >
                  <Trash2 size={13} />
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className={styles.entregaMeta}>
          CA {e.ca || "—"} · Qtd {e.qtd} · {e.fornecedor || "Fornecedor não informado"}
        </div>
        <div className={styles.entregaMeta}>
          {fmtMoney(e.valorUnit)} / un · Troca prevista: <span className="mono">{e.dataTroca || "—"}</span>
        </div>
        {e.obs ? <div className={styles.entregaObs}>{e.obs}</div> : null}
        <div className={styles.entregaResp}>Registrado por {e.responsavel}</div>
      </div>
    );
  }

  return (
    <Drawer title="Ficha do colaborador" subtitle={titleCase(colaborador.nome)} onClose={onClose} width={520}>
      <div className={styles.header}>
        <Avatar iniciais={iniciais(colaborador.nome)} size={52} />
        <div>
          <div className={styles.nome}>{titleCase(colaborador.nome)}</div>
          <div className={styles.cargo}>
            {colaborador.cargo ? titleCase(colaborador.cargo) : "—"} · {deptName(colaborador.departamento)}
          </div>
        </div>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>CPF</div>
          <div className={`${styles.infoValue} mono`}>{maskCpf(colaborador.cpf)}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Nascimento</div>
          <div className={`${styles.infoValue} mono`}>{isoToBR(colaborador.nascimento)}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Idade</div>
          <div className={styles.infoValue}>{idade != null ? `${idade} anos` : "—"}</div>
        </div>
      </div>

      {canEdit ? (
        <Button onClick={() => setShowEntregaModal(true)} className={styles.registrarButton}>
          <PackagePlus size={15} /> Registrar entrega de EPI
        </Button>
      ) : null}

      {divergencia.semEntrega.length > 0 ? (
        <div className={styles.bannerDanger}>
          <TriangleAlert size={16} />
          <div>
            <strong>
              Divergência: {divergencia.semEntrega.length} EPI{divergencia.semEntrega.length > 1 ? "s" : ""} obrigatório
              {divergencia.semEntrega.length > 1 ? "s" : ""} sem entrega registrada
            </strong>
            <ul className={styles.bannerList}>
              {divergencia.semEntrega.map((epi) => (
                <li key={epi}>{epi}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : mandatorios.length > 0 ? (
        <div className={styles.bannerSuccess}>
          <CircleCheck size={16} />
          <span>Todos os EPIs obrigatórios da função possuem entrega registrada.</span>
        </div>
      ) : null}

      <div className={styles.sectionTitleRow}>
        <div className={styles.sectionTitle}>Histórico de entregas ({entregas.length})</div>
        <button
          type="button"
          className={styles.verAssinadasButton}
          onClick={() => setShowFichasAssinadas(true)}
          disabled={fichasAssinadas.length === 0}
          title={fichasAssinadas.length === 0 ? "Nenhuma ficha assinada ainda" : "Ver histórico de fichas assinadas"}
        >
          <FileCheck2 size={13} /> Fichas assinadas ({fichasAssinadas.length})
        </button>
      </div>
      {entregas.length === 0 ? (
        <div className={styles.emptyInline}>Nenhuma entrega registrada para este colaborador ainda.</div>
      ) : (
        <div className={styles.entregaList}>
          {entregasAbertas.length > 0 ? (
            <div className={styles.loteAberto}>
              <div className={styles.loteAbertoLabel}>
                Ainda não incluído em uma ficha ({entregasAbertas.length} item{entregasAbertas.length > 1 ? "s" : ""})
              </div>
              {entregasAbertas.map((e) => renderEntregaCard(e, canEdit))}
              {canEdit ? (
                <>
                  <Button onClick={handleGerarFicha} className={styles.gerarFichaButton}>
                    <FileDown size={15} /> Gerar ficha (PDF) — {entregasAbertas.length} item{entregasAbertas.length > 1 ? "s" : ""}
                  </Button>
                  {erroFicha ? (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)", marginTop: 6 }}>{erroFicha}</div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {fichasDoColab.map((ficha) => {
            const entregasDaFicha = entregas.filter((e) => e.fichaId === ficha.id);
            return (
              <div key={ficha.id} className={styles.fichaGrupo}>
                <div className={styles.fichaGrupoHeader}>
                  Ficha nº {codigoFichaEpi(ficha.numero)} · gerada em {ficha.geradaEm}
                </div>
                {entregasDaFicha.map((e) => renderEntregaCard(e, false))}
                <div className={styles.fichaGrupoControles}>
                  <FichaEpiControls
                    ficha={ficha}
                    entregas={entregasDaFicha}
                    colaborador={colaborador}
                    canEdit={canEdit}
                    onAnexarAssinatura={(file) => handleAnexarAssinatura(ficha.id, file)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEntregaModal ? (
        <RegistrarEntregaEpiModal
          colaboradorNome={titleCase(colaborador.nome)}
          epiOptions={mandatorios}
          epiPrecos={state.epiPrecos}
          epiCatalogo={epiCatalogo}
          onClose={() => setShowEntregaModal(false)}
          onSave={handleRegistrarEntrega}
        />
      ) : null}

      {entregaEmEdicao ? (
        <RegistrarEntregaEpiModal
          colaboradorNome={titleCase(colaborador.nome)}
          epiOptions={mandatorios}
          epiPrecos={state.epiPrecos}
          epiCatalogo={epiCatalogo}
          entregaParaEditar={entregaEmEdicao}
          onClose={() => setEntregaEmEdicao(null)}
          onSave={(payload) => handleEditarEntrega(entregaEmEdicao.id, payload)}
        />
      ) : null}

      {entregaParaExcluir ? (
        <ExcluirEntregaEpiModal
          entrega={entregaParaExcluir}
          onClose={() => setEntregaParaExcluir(null)}
          onConfirm={() => handleExcluirEntrega(entregaParaExcluir.id)}
        />
      ) : null}

      {showFichasAssinadas ? (
        <FichasAssinadasModal
          colaboradorNome={titleCase(colaborador.nome)}
          colaborador={colaborador}
          fichas={fichasAssinadas}
          entregas={entregas}
          onClose={() => setShowFichasAssinadas(false)}
        />
      ) : null}
    </Drawer>
  );
}
