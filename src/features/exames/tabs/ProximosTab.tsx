import { useMemo, useState } from "react";
import { Card, EmptyState, StatusBadge } from "../../../components/ui";
import { useAuth } from "../../../auth/AuthContext";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { portalRepository } from "../../../repositories/portalRepository";
import { statusDoRegistro } from "../../../domain/exameStatus";
import { titleCase } from "../../../domain/text";
import { mesAbrev, parseBR } from "../../../domain/dates";
import { ativosDe, todosOsCargos } from "../lib/exameUtils";
import { ExameFichaDrawer } from "../ExameFichaDrawer";
import { AnexarExameModal } from "../AnexarExameModal";
import type { AnexarExamePayload } from "../AnexarExameModal";
import { anexarExame } from "../../../repositories/anexosExamesRepository";
import { registrarLog } from "../../../repositories/logRepository";
import { criarLogEntry } from "../../../domain/logEntry";
import type { Colaborador, ExameRegistro } from "../../../types/domain";
import shared from "../ExamesShared.module.css";
import styles from "./ProximosTab.module.css";

interface Item {
  colab: Colaborador;
  exame: ExameRegistro;
}

export function ProximosTab() {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [selectedColabId, setSelectedColabId] = useState<number | null>(null);
  const [anexarItem, setAnexarItem] = useState<Item | null>(null);

  const cargosOcupacionais = useMemo(
    () => todosOsCargos(portalRepository.getMatrizOcupacional().cargos, state.matrizAdd),
    [state.matrizAdd],
  );

  const ativos = useMemo(() => ativosDe(state.colaboradores, state.desligados), [state.colaboradores, state.desligados]);

  const itens = useMemo<Item[]>(() => {
    const lista: Item[] = [];
    for (const colab of ativos) {
      for (const exame of colab.exames ?? []) {
        if (statusDoRegistro(exame) === "A vencer") lista.push({ colab, exame });
      }
    }
    return lista.sort((a, b) => (parseBR(a.exame.proximo)?.getTime() ?? 0) - (parseBR(b.exame.proximo)?.getTime() ?? 0));
  }, [ativos]);

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
      <p className={shared.intro}>Exames com vencimento nos próximos 60 dias, ordenados por data.</p>

      {itens.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum exame a vencer" description="Não há exames ocupacionais vencendo nos próximos 60 dias." />
        </Card>
      ) : (
        <div className={styles.list}>
          {itens.map(({ colab, exame }, i) => {
            const data = parseBR(exame.proximo);
            return (
              <Card key={`${colab.id}-${exame.proc}-${i}`} className={styles.row}>
                <div className={styles.dateBlock}>
                  <span className={styles.dateDay}>{data ? String(data.getDate()).padStart(2, "0") : "—"}</span>
                  <span className={styles.dateMonth}>{data ? mesAbrev(data.getMonth() + 1) : ""}</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.info}>
                  <div className={styles.examName}>{exame.proc}</div>
                  <div className={styles.colabLine}>
                    {titleCase(colab.nome)} {colab.cargo ? `· ${titleCase(colab.cargo)}` : ""}
                  </div>
                </div>
                <div className={styles.right}>
                  <StatusBadge label="A vencer" tone="warning" />
                  {canEdit ? (
                    <button type="button" className={shared.linkButton} onClick={() => setAnexarItem({ colab, exame })}>
                      Anexar
                    </button>
                  ) : (
                    <button type="button" className={shared.linkButton} onClick={() => setSelectedColabId(colab.id)}>
                      Ver ficha
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedColabId != null ? <ExameFichaDrawer colabId={selectedColabId} onClose={() => setSelectedColabId(null)} /> : null}

      {anexarItem ? (
        <AnexarExameModal
          colaboradores={[anexarItem.colab]}
          cargosOcupacionais={cargosOcupacionais}
          examePrecos={state.examePrecos}
          initialColabId={anexarItem.colab.id}
          initialProc={anexarItem.exame.proc}
          onClose={() => setAnexarItem(null)}
          onSave={handleAnexar}
        />
      ) : null}
    </div>
  );
}
