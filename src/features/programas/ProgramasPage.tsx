import { useMemo, useState } from "react";
import { AlertTriangle, FileText, Upload } from "lucide-react";
import { Button, Card, StatusBadge, Table, Td, Th, THead, Tr } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { usePortalStore } from "../../store/PortalStoreContext";
import { portalRepository } from "../../repositories/portalRepository";
import { todosOsCargos } from "../exames/lib/exameUtils";
import { computeProgramaStatus, diasRestantesPrograma, toneForStatusPrograma, versoesMaisRecentes } from "../../domain/programaStatus";
import { extrairVigenciaDeTextoExistente } from "../../domain/lerDocumentoPrograma";
import { cargosSemCorrespondencia } from "../../domain/cargoDivergencia";
import { registrarVersaoPrograma, getProgramaSignedUrl } from "../../repositories/programasSaudeRepository";
import { criarLogEntry } from "../../domain/logEntry";
import { registrarLog } from "../../repositories/logRepository";
import type { NomePrograma, ProgramaSaude } from "../../types/domain";
import { RegistrarVersaoModal } from "./RegistrarVersaoModal";
import styles from "./ProgramasPage.module.css";

const PROGRAMAS: NomePrograma[] = ["PCMSO", "PGR"];

function formatarVigencia(valor: string, precisao: "dia" | "mes"): string {
  if (!valor) return "—";
  if (precisao === "mes") {
    const [ano, mes] = valor.split("-");
    return `${mes}/${ano}`;
  }
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ProgramasPage() {
  const { user } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [modalPrograma, setModalPrograma] = useState<NomePrograma | null>(null);
  const [abrindoPath, setAbrindoPath] = useState<string | null>(null);

  const matriz = useMemo(() => portalRepository.getMatrizOcupacional(), []);
  const cargosCompletos = useMemo(() => todosOsCargos(matriz.cargos, state.matrizAdd), [matriz.cargos, state.matrizAdd]);
  const colaboradoresAtivos = useMemo(() => state.colaboradores.filter((c) => !c.desligado), [state.colaboradores]);

  const versoesRecentes = useMemo(() => versoesMaisRecentes(state.programasSaude), [state.programasSaude]);
  const divergencias = useMemo(() => cargosSemCorrespondencia(colaboradoresAtivos, cargosCompletos), [colaboradoresAtivos, cargosCompletos]);

  const historico = useMemo(
    () => state.programasSaude.slice().sort((a, b) => b.ts.localeCompare(a.ts)),
    [state.programasSaude],
  );

  async function handleSalvarVersao(programa: NomePrograma, input: Parameters<Parameters<typeof RegistrarVersaoModal>[0]["onSave"]>[0]) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await registrarVersaoPrograma({
      programa,
      descricao: input.descricao,
      vigenciaInicio: input.vigenciaInicio,
      vigenciaFim: input.vigenciaFim,
      precisaoFim: input.precisaoFim,
      origem: input.origem,
      file: input.file,
      confirmadoPor: user.email,
    });
    if (!result.ok) return result;
    dispatch({ type: "ADICIONAR_VERSAO_PROGRAMA", versao: result.versao });
    const entry = criarLogEntry({
      action: "Programa de saúde ocupacional atualizado",
      colabId: null,
      colaboradores: state.colaboradores,
      detail: `${programa} · vigência até ${input.vigenciaFim}`,
      user: user.email,
      ts: result.versao.ts,
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  async function handleAbrirArquivo(storagePath: string) {
    setAbrindoPath(storagePath);
    const result = await getProgramaSignedUrl(storagePath);
    setAbrindoPath(null);
    if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
  }

  function extracaoInicialPara(programa: NomePrograma) {
    const texto = programa === "PCMSO" ? matriz.fonte.pcmso : matriz.fonte.pgr;
    const vigencia = extrairVigenciaDeTextoExistente(texto);
    return { vigencia, descricao: texto };
  }

  return (
    <div className={styles.page}>
      <div className={styles.cardsRow}>
        {PROGRAMAS.map((programa) => {
          const versao = versoesRecentes.find((v) => v.programa === programa);
          const semVersaoConfirmada = !versao;
          const status = versao ? computeProgramaStatus(versao.vigenciaFim, versao.precisaoFim) : "Vencido";
          const dias = versao ? diasRestantesPrograma(versao.vigenciaFim, versao.precisaoFim) : null;

          return (
            <Card key={programa} className={styles.programaCard}>
              <div className={styles.programaHeader}>
                <span className={styles.programaNome}>{programa}</span>
                {!semVersaoConfirmada && <StatusBadge label={status} tone={toneForStatusPrograma(status)} />}
              </div>

              {semVersaoConfirmada ? (
                <>
                  <div className={styles.semVersao}>
                    Ainda não confirmado nesta tela. Descrição atual da matriz: "{extracaoInicialPara(programa).descricao}"
                  </div>
                  <Button onClick={() => setModalPrograma(programa)}>Confirmar vigência atual</Button>
                </>
              ) : (
                <>
                  <div className={styles.linhaInfo}>
                    <span>
                      Início: <strong>{formatarVigencia(versao.vigenciaInicio, versao.precisaoFim)}</strong>
                    </span>
                    <span>
                      Validade: <strong>{formatarVigencia(versao.vigenciaFim, versao.precisaoFim)}</strong>
                    </span>
                  </div>
                  {dias !== null && (
                    <div className={styles.diasRestantes}>
                      {dias >= 0 ? `${dias} dia(s) restante(s)` : `Vencido há ${Math.abs(dias)} dia(s)`}
                    </div>
                  )}
                  <div className={styles.descricao}>{versao.descricao}</div>
                  <Button variant="secondary" onClick={() => setModalPrograma(programa)}>
                    <Upload size={14} /> Carregar novo documento
                  </Button>
                </>
              )}
            </Card>
          );
        })}
      </div>

      {divergencias.length > 0 && (
        <div className={styles.alertaCargos}>
          <div className={styles.alertaCargosHeader}>
            <AlertTriangle size={16} /> Sugestão de revisão — cargos sem correspondência nos programas ({divergencias.length})
          </div>
          <div style={{ fontSize: 12.5, color: "#7a5a12", marginBottom: 10 }}>
            Esses cargos existem em colaboradores ativos hoje, mas não foram encontrados na matriz do PCMSO/PGR (nem na lista original, nem
            nos cargos já adicionados pelo RH). Isso não altera nada automaticamente — é só um alerta para revisar na próxima renovação.
          </div>
          {divergencias.map((d) => (
            <div key={d.cargo} className={styles.cargoDivergenteRow}>
              <span className={styles.cargoDivergenteNome}>{d.cargo}</span>
              <span className={styles.cargoDivergenteCount}>
                {d.colaboradores.length} colaborador{d.colaboradores.length === 1 ? "" : "es"}
              </span>
            </div>
          ))}
        </div>
      )}

      <Card>
        <div className={styles.sectionTitle}>Histórico de versões</div>
        {historico.length === 0 ? (
          <div className={styles.semVersao}>Nenhuma versão confirmada ainda.</div>
        ) : (
          <Table>
            <THead>
              <Th>Programa</Th>
              <Th>Versão/documento</Th>
              <Th>Carregado em</Th>
              <Th>Vigência</Th>
              <Th>Confirmado por</Th>
              <Th>Arquivo</Th>
            </THead>
            <tbody>
              {historico.map((v: ProgramaSaude) => (
                <Tr key={v.id}>
                  <Td>
                    <strong>{v.programa}</strong>
                  </Td>
                  <Td>{v.fileName || v.origem || "—"}</Td>
                  <Td mono>{v.ts}</Td>
                  <Td>
                    {formatarVigencia(v.vigenciaInicio, v.precisaoFim)} – {formatarVigencia(v.vigenciaFim, v.precisaoFim)}
                  </Td>
                  <Td>{v.confirmadoPor}</Td>
                  <Td>
                    {v.storagePath ? (
                      <button type="button" className={styles.linkArquivo} onClick={() => handleAbrirArquivo(v.storagePath!)}>
                        <FileText size={13} style={{ verticalAlign: "text-bottom", marginRight: 4 }} />
                        {abrindoPath === v.storagePath ? "Abrindo…" : "Ver PDF"}
                      </button>
                    ) : (
                      "—"
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {modalPrograma && (
        <RegistrarVersaoModal
          programa={modalPrograma}
          extracaoInicial={!versoesRecentes.find((v) => v.programa === modalPrograma) ? extracaoInicialPara(modalPrograma) : undefined}
          onClose={() => setModalPrograma(null)}
          onSave={(input) => handleSalvarVersao(modalPrograma, input)}
        />
      )}
    </div>
  );
}
