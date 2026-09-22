import { useMemo, useState } from "react";
import { Activity, Briefcase, FilePlus2, Tag, UserMinus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, Card, SearchInput } from "../../../components/ui";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { iniciais, titleCase } from "../../../domain/text";
import { matchesColaboradorSearch } from "../lib/exameUtils";
import { ExameFichaDrawer } from "../ExameFichaDrawer";
import shared from "../ExamesShared.module.css";
import styles from "./HistoricoTab.module.css";

function iconForAction(action: string): LucideIcon {
  if (action.includes("Exame anexado")) return FilePlus2;
  if (action.includes("desligado")) return UserMinus;
  if (action.includes("Preço")) return Tag;
  if (action.includes("Cargo adicionado")) return Briefcase;
  return Activity;
}

export function HistoricoTab() {
  const { state } = usePortalStore();
  const [search, setSearch] = useState("");
  const [selectedColabId, setSelectedColabId] = useState<number | null>(null);

  const attachmentsCountByColab = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of state.attachments) map.set(a.colabId, (map.get(a.colabId) ?? 0) + 1);
    return map;
  }, [state.attachments]);

  const colaboradoresFiltrados = useMemo(
    () =>
      state.colaboradores
        .filter((c) => matchesColaboradorSearch(c, search))
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [state.colaboradores, search],
  );

  const logEntries = useMemo(() => state.log.slice(0, 60), [state.log]);

  return (
    <div className={styles.wrap}>
      <Card>
        <div className={styles.cardTitle}>Consultar colaborador</div>
        <div className={styles.cardSubtitle}>
          Busque por nome ou CPF para abrir a ficha completa — inclui colaboradores desligados, com histórico preservado.
        </div>
        <SearchInput placeholder="Nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className={styles.colabList} style={{ marginTop: 10 }}>
          {colaboradoresFiltrados.length === 0 ? (
            <div className={shared.emptyInline}>Nenhum colaborador encontrado.</div>
          ) : (
            colaboradoresFiltrados.map((c) => {
              const desligado = state.desligados[c.id];
              const docs = attachmentsCountByColab.get(c.id) ?? 0;
              return (
                <button key={c.id} type="button" className={styles.colabRow} onClick={() => setSelectedColabId(c.id)}>
                  <Avatar iniciais={iniciais(c.nome)} size={32} tone={desligado ? "purple" : "brand"} />
                  <div className={styles.colabInfo}>
                    <div className={styles.colabNome}>{titleCase(c.nome)}</div>
                    <div className={styles.colabCargo}>{c.cargo ? titleCase(c.cargo) : "—"}</div>
                  </div>
                  <div className={styles.colabTags}>
                    {docs > 0 ? <span className={styles.docsTag}>{docs} docs</span> : null}
                    {desligado ? <span className={styles.desligadoTag}>Desligado</span> : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      <Card>
        <div className={styles.cardTitle}>Registro de alterações · rastreabilidade</div>
        <div className={styles.cardSubtitle}>Últimos lançamentos realizados no módulo de exames ocupacionais, mais recentes primeiro.</div>
        {logEntries.length === 0 ? (
          <div className={shared.emptyInline}>Nenhuma alteração registrada ainda — os lançamentos aparecerão aqui automaticamente.</div>
        ) : (
          <div className={styles.logList}>
            {logEntries.map((entry, i) => {
              const Icon = iconForAction(entry.action);
              const clickable = entry.colabId != null;
              return (
                <div
                  key={i}
                  className={clickable ? styles.logRowClickable : styles.logRow}
                  onClick={clickable ? () => setSelectedColabId(entry.colabId as number) : undefined}
                >
                  <div className={styles.logIcon}>
                    <Icon size={14} />
                  </div>
                  <div className={styles.logInfo}>
                    <div className={styles.logAction}>
                      <strong>{entry.action}</strong>
                      {entry.colabNome ? ` — ${entry.colabNome}` : ""}
                    </div>
                    {entry.detail ? <div className={styles.logDetail}>{entry.detail}</div> : null}
                    <div className={styles.logMeta}>
                      {entry.user} · {entry.ts}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selectedColabId != null ? <ExameFichaDrawer colabId={selectedColabId} onClose={() => setSelectedColabId(null)} /> : null}
    </div>
  );
}
