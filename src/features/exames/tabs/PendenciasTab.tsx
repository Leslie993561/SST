import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Avatar, Card, StatusBadge } from "../../../components/ui";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { statusDoRegistro } from "../../../domain/exameStatus";
import { deptName, iniciais, titleCase } from "../../../domain/text";
import { ativosDe } from "../lib/exameUtils";
import { ExameFichaDrawer } from "../ExameFichaDrawer";
import shared from "../ExamesShared.module.css";
import styles from "./PendenciasTab.module.css";

export function PendenciasTab() {
  const { state } = usePortalStore();
  const [selectedColabId, setSelectedColabId] = useState<number | null>(null);

  const ativos = useMemo(() => ativosDe(state.colaboradores, state.desligados), [state.colaboradores, state.desligados]);

  const linhas = useMemo(() => {
    const resultado = ativos
      .map((colab) => {
        const vencidos = (colab.exames ?? []).filter((e) => statusDoRegistro(e) === "Vencido");
        const revisao = (colab.exames ?? []).filter((e) => statusDoRegistro(e) === "Necessita revisão");
        const total = vencidos.length + revisao.length;
        return { colab, vencidos: vencidos.length, revisao: revisao.length, total, hasVencido: vencidos.length > 0 };
      })
      .filter((r) => r.total > 0);
    return resultado.sort((a, b) => {
      if (a.hasVencido !== b.hasVencido) return a.hasVencido ? -1 : 1;
      return b.total - a.total;
    });
  }, [ativos]);

  return (
    <div className={styles.wrap}>
      <p className={shared.intro}>
        As pendências são agrupadas por colaborador, não por exame — cada card abaixo reúne todos os exames ocupacionais vencidos ou que
        necessitam revisão de uma mesma pessoa, para facilitar o acompanhamento e a priorização do RH.
      </p>

      <div className={styles.header}>
        Colaboradores com exames ocupacionais pendentes <span className={styles.headerCount}>· {linhas.length}</span>
      </div>

      {linhas.length === 0 ? (
        <div className={shared.emptyInline}>Nenhum colaborador com exames pendentes — base em conformidade.</div>
      ) : (
        <div className={styles.list}>
          {linhas.map(({ colab, vencidos, revisao, total, hasVencido }) => {
            const partes: string[] = [];
            if (vencidos > 0) partes.push(`${vencidos} exame${vencidos > 1 ? "s" : ""} vencido${vencidos > 1 ? "s" : ""}`);
            if (revisao > 0) partes.push(`${revisao} a revisar`);
            return (
              <Card key={colab.id} padded={false}>
                <button type="button" className={styles.card} onClick={() => setSelectedColabId(colab.id)}>
                  <Avatar iniciais={iniciais(colab.nome)} size={40} tone={hasVencido ? "danger" : "purple"} />
                  <div className={styles.info}>
                    <div className={styles.nome}>{titleCase(colab.nome)} — exames ocupacionais pendentes</div>
                    <div className={styles.subtitle}>
                      {colab.cargo ? titleCase(colab.cargo) : "—"} · {deptName(colab.departamento)} · {partes.join(" · ")}
                    </div>
                  </div>
                  <div className={styles.right}>
                    <StatusBadge label={String(total)} tone={hasVencido ? "danger" : "purple"} />
                    <ChevronRight size={16} color="var(--color-muted-light)" />
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {selectedColabId != null ? <ExameFichaDrawer colabId={selectedColabId} onClose={() => setSelectedColabId(null)} /> : null}
    </div>
  );
}
