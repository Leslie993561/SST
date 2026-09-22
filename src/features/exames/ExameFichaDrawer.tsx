import { useMemo, useRef, useState } from "react";
import { FileText, Paperclip, Plus, UserMinus } from "lucide-react";
import { Avatar, Button, Drawer, StatusBadge } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { usePortalStore } from "../../store/PortalStoreContext";
import { portalRepository } from "../../repositories/portalRepository";
import { colaboradoresRepository } from "../../repositories/colaboradoresRepository";
import { removerDesligamentoPendente } from "../../repositories/desligamentoPendenteRepository";
import { registrarAsoDemissionalPendente, removerAsoDemissionalPendente } from "../../repositories/asoDemissionalPendenteRepository";
import { anexarExame, getAnexoSignedUrl } from "../../repositories/anexosExamesRepository";
import { abrirAnexoUmaVez } from "../../domain/abrirArquivo";
import { registrarLog } from "../../repositories/logRepository";
import { criarLogEntry } from "../../domain/logEntry";
import { statusDoRegistro, toneForStatus } from "../../domain/exameStatus";
import { deptName, fmtMoney, iniciais, maskCpf, titleCase } from "../../domain/text";
import { idadeFromISO, isoToBR, stamp } from "../../domain/dates";
import { uid } from "../../store/seed";
import { todosOsCargos } from "./lib/exameUtils";
import { AnexarExameModal } from "./AnexarExameModal";
import type { AnexarExamePayload } from "./AnexarExameModal";
import { DesligarColaboradorModal } from "./DesligarColaboradorModal";
import shared from "./ExamesShared.module.css";
import styles from "./ExameFichaDrawer.module.css";

interface ExameFichaDrawerProps {
  colabId: number;
  onClose: () => void;
  /** Quando aberto a partir da notificação "Desligamento pendente" do Dashboard, já mostra
   * a tela de confirmação de desligamento pré-preenchida com o que veio do PeopleFlow. */
  abrirDesligarPendente?: { dataIso: string; motivo: string };
}

export function ExameFichaDrawer({ colabId, onClose, abrirDesligarPendente }: ExameFichaDrawerProps) {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [anexarProc, setAnexarProc] = useState<string | undefined | null>(null);
  const [anexarTipo, setAnexarTipo] = useState<string | undefined>(undefined);
  const [desligarOpen, setDesligarOpen] = useState(Boolean(abrirDesligarPendente));
  const [abrindoPath, setAbrindoPath] = useState<string | null>(null);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  // Trava síncrona contra clique duplo — o estado abrindoPath só desabilita o
  // botão depois de um re-render, tarde demais pra barrar dois cliques bem
  // rápidos (ex.: duplo clique real), que abriam duas abas com o mesmo anexo.
  const abrindoRef = useRef(false);

  const colaborador = state.colaboradores.find((c) => c.id === colabId);
  const desligamento = state.desligados[colabId];

  const cargosOcupacionais = useMemo(
    () => todosOsCargos(portalRepository.getMatrizOcupacional().cargos, state.matrizAdd),
    [state.matrizAdd],
  );
  const catalogoExames = useMemo(() => portalRepository.getMatrizOcupacional().catalogoExames, []);

  const attachments = useMemo(
    () =>
      state.attachments
        .filter((a) => a.colabId === colabId)
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts)),
    [state.attachments, colabId],
  );

  if (!colaborador) {
    return (
      <Drawer title="Ficha do colaborador" onClose={onClose}>
        <div className={styles.notFound}>Colaborador não encontrado.</div>
      </Drawer>
    );
  }

  const idade = idadeFromISO(colaborador.nascimento);

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
    if (desligamento && state.asoDemissionalPendentes.some((p) => p.colabId === payload.colabId)) {
      // O RH finalmente anexou o exame do colaborador desligado — a pendência que
      // apareceu no Dashboard desde o desligamento não tem mais motivo de existir.
      dispatch({ type: "REMOVER_ASO_DEMISSIONAL_PENDENTE", colabId: payload.colabId });
      void removerAsoDemissionalPendente(payload.colabId);
    }
    return { ok: true as const };
  }

  /** Anexo mais recente para um exame específico deste colaborador (se houver). */
  function attachmentFor(proc: string) {
    return attachments.find((a) => a.proc === proc);
  }

  async function handleAbrirAnexo(storagePath: string) {
    if (abrindoRef.current) return;
    abrindoRef.current = true;
    setAbrindoPath(storagePath);
    setErroAnexo(null);
    try {
      const result = await abrirAnexoUmaVez(storagePath, () => getAnexoSignedUrl(storagePath));
      if ("error" in result) {
        setErroAnexo(`Falha ao gerar o link do arquivo: ${result.error}`);
      }
    } finally {
      abrindoRef.current = false;
      setAbrindoPath(null);
    }
  }

  async function handleDesligar(dataIso: string, motivo: string, precisaExameDemissional: boolean) {
    if (!user || !colaborador) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await colaboradoresRepository.desligarColaborador(colabId, dataIso, motivo);
    if (!result.ok) return result;
    dispatch({ type: "DESLIGAR_COLABORADOR", colabId, date: isoToBR(dataIso), motivo, by: user.email });
    const entry = criarLogEntry({
      action: "Colaborador desligado",
      colabId,
      colaboradores: state.colaboradores,
      detail: motivo,
      user: user.email,
      ts: stamp(),
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    if (abrirDesligarPendente) {
      // Efetivação de uma solicitação vinda do PeopleFlow — encerra a pendência
      // para não continuar aparecendo no Dashboard.
      dispatch({ type: "REMOVER_DESLIGAMENTO_PENDENTE", colaboradorNome: colaborador.nome });
      removerDesligamentoPendente(colaborador.nome).catch(() => {
        // já foi removido do estado local; se o delete remoto falhar, a linha só reaparece
        // no próximo carregamento — sem impacto no fluxo que o usuário já concluiu.
      });
    }
    if (precisaExameDemissional) {
      // Abre o anexo de exame já com o tipo "Demissional" pré-selecionado — o exame
      // específico (proc) continua livre, pois depende da matriz do cargo. Além
      // disso, registra uma pendência rastreada (card no Dashboard) — o modal de
      // anexo sozinho é fácil de fechar sem anexar nada e sem deixar rastro.
      const pendente = {
        id: uid("ADP"),
        colabId,
        desligadoEm: isoToBR(dataIso),
        motivo,
        solicitadoPor: user.email,
        ts: stamp(),
      };
      dispatch({ type: "ADICIONAR_ASO_DEMISSIONAL_PENDENTE", pendente });
      void registrarAsoDemissionalPendente(pendente);
      setAnexarTipo("Demissional");
      setAnexarProc(undefined);
    }
    return { ok: true as const };
  }

  return (
    <Drawer title="Ficha do colaborador" subtitle={titleCase(colaborador.nome)} onClose={onClose} width={540}>
      <div className={styles.header}>
        <Avatar iniciais={iniciais(colaborador.nome)} size={52} tone={desligamento ? "purple" : "brand"} />
        <div>
          <div className={styles.nome}>{titleCase(colaborador.nome)}</div>
          <div className={styles.cargo}>
            {colaborador.cargo ? titleCase(colaborador.cargo) : "—"} · {deptName(colaborador.departamento)}
          </div>
          {desligamento ? (
            <div className={styles.desligadoBadge}>
              <StatusBadge label={`Desligado em ${desligamento.date}`} tone="danger" />
            </div>
          ) : null}
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
        <div className={styles.actionsRow}>
          <Button
            onClick={() => {
              setAnexarTipo(undefined);
              setAnexarProc(undefined);
            }}
          >
            <Plus size={15} /> Anexar exame
          </Button>
          {!desligamento ? (
            <Button variant="danger" onClick={() => setDesligarOpen(true)}>
              <UserMinus size={15} /> Desligar colaborador
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={styles.sectionTitle}>Exames ocupacionais ({colaborador.exames.length})</div>
      {colaborador.exames.length === 0 ? (
        <div className={styles.emptyInline}>Nenhum exame ocupacional registrado para este colaborador.</div>
      ) : (
        <div>
          {colaborador.exames.map((exame) => {
            const status = statusDoRegistro(exame, new Date(), { idadeColab: idade, catalogo: catalogoExames });
            const podeAnexar = canEdit && status !== "Em dia" && status !== "A vencer";
            const anexo = attachmentFor(exame.proc);
            return (
              <div key={exame.proc} className={styles.examRow}>
                <div className={styles.examInfo}>
                  <div className={styles.examProc}>{exame.proc}</div>
                  <div className={`${styles.examDates} mono`}>
                    Último: {exame.ultimo || "—"} · Próximo: {exame.proximo || "—"}
                  </div>
                </div>
                <div className={styles.examRight}>
                  <StatusBadge label={status} tone={toneForStatus(status)} />
                  {anexo ? (
                    anexo.storagePath ? (
                      <button
                        type="button"
                        className={styles.docLink}
                        disabled={abrindoPath === anexo.storagePath}
                        onClick={() => handleAbrirAnexo(anexo.storagePath!)}
                        title={`Documento: ${anexo.fileName || "arquivo anexado"}`}
                      >
                        <FileText size={13} />
                      </button>
                    ) : (
                      <span className={styles.docLink} title={`Documento: ${anexo.fileName || "sem nome de arquivo"} (sem arquivo anexado)`}>
                        <FileText size={13} />
                      </span>
                    )
                  ) : null}
                  {podeAnexar ? (
                    <button
                      type="button"
                      className={shared.iconButton}
                      title="Anexar exame"
                      onClick={() => {
                        setAnexarTipo(undefined);
                        setAnexarProc(exame.proc);
                      }}
                    >
                      <Paperclip size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.sectionTitle}>Anexos / comprovantes ({attachments.length})</div>
      {attachments.length === 0 ? (
        <div className={styles.emptyInline}>Nenhum anexo registrado para este colaborador ainda.</div>
      ) : (
        <div>
          {attachments.map((a) => (
            <div key={a.id} className={styles.attachCard}>
              <div className={styles.attachHeader}>
                <span>{a.proc}</span>
                <span className="mono">{fmtMoney(a.valor)}</span>
              </div>
              <div className={styles.attachMeta}>
                Realizado em <span className="mono">{a.dataISO}</span> · {a.fornecedor || "Fornecedor não informado"}
              </div>
              <div className={styles.attachMeta}>
                {a.fileName ? (
                  a.storagePath ? (
                    <button
                      type="button"
                      className={styles.attachFileLink}
                      disabled={abrindoPath === a.storagePath}
                      onClick={() => handleAbrirAnexo(a.storagePath!)}
                    >
                      <FileText size={12} /> {a.fileName}
                    </button>
                  ) : (
                    a.fileName
                  )
                ) : (
                  "Sem arquivo anexado"
                )}{" "}
                · lançado por {a.responsavel} em {a.ts}
              </div>
            </div>
          ))}
        </div>
      )}

      {erroAnexo ? (
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)" }}>{erroAnexo}</div>
      ) : null}

      {anexarProc !== null ? (
        <AnexarExameModal
          colaboradores={[colaborador]}
          cargosOcupacionais={cargosOcupacionais}
          examePrecos={state.examePrecos}
          initialColabId={colabId}
          initialProc={anexarProc}
          initialTipo={anexarTipo}
          onClose={() => {
            setAnexarProc(null);
            setAnexarTipo(undefined);
          }}
          onSave={handleAnexar}
        />
      ) : null}

      {desligarOpen ? (
        <DesligarColaboradorModal
          colaboradorNome={titleCase(colaborador.nome)}
          initialDataIso={abrirDesligarPendente?.dataIso}
          initialMotivo={abrirDesligarPendente?.motivo}
          onClose={() => setDesligarOpen(false)}
          onConfirm={handleDesligar}
        />
      ) : null}
    </Drawer>
  );
}
