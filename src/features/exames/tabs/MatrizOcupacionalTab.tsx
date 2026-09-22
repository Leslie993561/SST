import { useMemo, useState } from "react";
import { Briefcase, ClipboardList, HeartPulse, Pencil, Plus, ShieldCheck } from "lucide-react";
import { Button, Card, KpiCard, SearchInput, StatusBadge, Table, Td, Th, THead, Tr } from "../../../components/ui";
import { PriceEditModal } from "../../../components/shared/PriceEditModal";
import { useAuth } from "../../../auth/AuthContext";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { portalRepository } from "../../../repositories/portalRepository";
import { fmtMoney, titleCase } from "../../../domain/text";
import { isoToBR, stamp } from "../../../domain/dates";
import { criarLogEntry } from "../../../domain/logEntry";
import { abreviaSituacao, periodicidadeInfo, todosOsCargos } from "../lib/exameUtils";
import { AdicionarCargoModal } from "../AdicionarCargoModal";
import { editarPrecoExame } from "../../../repositories/precosRepository";
import { adicionarCargoMatriz } from "../../../repositories/matrizAddRepository";
import { registrarLog } from "../../../repositories/logRepository";
import type { CargoOcupacional } from "../../../types/domain";
import shared from "../ExamesShared.module.css";
import styles from "./MatrizOcupacionalTab.module.css";

export function MatrizOcupacionalTab() {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [showAddCargo, setShowAddCargo] = useState(false);
  const [editandoCodigo, setEditandoCodigo] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const matriz = useMemo(() => portalRepository.getMatrizOcupacional(), []);
  const cargos = useMemo(() => todosOsCargos(matriz.cargos, state.matrizAdd), [matriz.cargos, state.matrizAdd]);

  const totalExamesDistintos = useMemo(
    () => new Set(cargos.flatMap((c) => c.exames.map((e) => e.codigo || e.nome))).size,
    [cargos],
  );
  const totalEpisDistintos = useMemo(() => new Set(cargos.flatMap((c) => c.epis.map((e) => e.epi))).size, [cargos]);

  const cargosFiltrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return cargos;
    return cargos.filter((c) => c.nome.toLowerCase().includes(termo) || c.cbo.toLowerCase().includes(termo));
  }, [cargos, search]);

  const grupos = useMemo(() => {
    const map = new Map<string, CargoOcupacional[]>();
    for (const c of cargosFiltrados) {
      const amb = c.ambiente || "Sem classificação";
      const lista = map.get(amb) ?? [];
      lista.push(c);
      map.set(amb, lista);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [cargosFiltrados]);

  const linhaEditando = editandoCodigo ? matriz.catalogoExames.find((c) => c.codigo === editandoCodigo) : undefined;
  const precoEditando = editandoCodigo ? state.examePrecos[editandoCodigo] : undefined;

  async function salvarPreco(valor: number, fornecedor: string, dataCotacaoIso: string) {
    if (!user || !editandoCodigo) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const dataCotacao = dataCotacaoIso ? isoToBR(dataCotacaoIso) : "";
    const result = await editarPrecoExame(editandoCodigo, state.examePrecos[editandoCodigo], valor, fornecedor, dataCotacao);
    if (!result.ok) return result;
    dispatch({ type: "EDITAR_PRECO_EXAME", codigo: editandoCodigo, preco: result.preco });
    const entry = criarLogEntry({
      action: "Preço de exame atualizado",
      colabId: null,
      colaboradores: state.colaboradores,
      detail: editandoCodigo,
      user: user.email,
      ts: stamp(),
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  async function handleAddCargo(cargo: CargoOcupacional) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await adicionarCargoMatriz(cargo, user.email);
    if (!result.ok) return result;
    dispatch({ type: "ADICIONAR_CARGO_MATRIZ", cargo: result.cargo });
    const entry = criarLogEntry({
      action: "Cargo adicionado à matriz",
      colabId: null,
      colaboradores: state.colaboradores,
      detail: result.cargo.nome,
      user: user.email,
      ts: result.cargo._ts ?? stamp(),
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <p className={shared.intro}>
          Matriz ocupacional consolidada a partir do PCMSO ({matriz.fonte.pcmso}) e do PGR ({matriz.fonte.pgr}), CNAE {matriz.fonte.cnae}.
          Relaciona cada cargo aos seus riscos, EPIs e exames obrigatórios. {matriz.observacoesGerais}
        </p>
        {canEdit ? (
          <Button onClick={() => setShowAddCargo(true)}>
            <Plus size={15} /> Adicionar cargo
          </Button>
        ) : null}
      </div>

      <div className={styles.statsGrid}>
        <KpiCard icon={<Briefcase size={18} />} value={cargos.length} label="Cargos mapeados" />
        <KpiCard icon={<ClipboardList size={18} />} value={totalExamesDistintos} label="Códigos de exame distintos" tone="success" />
        <KpiCard icon={<ShieldCheck size={18} />} value={totalEpisDistintos} label="EPIs distintos" />
        <KpiCard icon={<HeartPulse size={18} />} value={`Grau ${matriz.fonte.grauRisco}`} label="PCMSO + PGR" tone="warning" />
      </div>

      <Card>
        <div className={styles.sectionTitle}>Catálogo de exames (PCMSO)</div>
        <Table>
          <THead>
            <Th>Código</Th>
            <Th>Exame</Th>
            <Th>Situações</Th>
            <Th>Periodicidade</Th>
            <Th>Valor do exame</Th>
            <Th>Cargos</Th>
          </THead>
          <tbody>
            {matriz.catalogoExames.map((entrada) => {
              const info = periodicidadeInfo(entrada.periodicidades[0]);
              const valor = state.examePrecos[entrada.codigo]?.valor ?? 0;
              return (
                <Tr key={entrada.codigo}>
                  <Td mono>{entrada.codigo}</Td>
                  <Td>
                    {entrada.nome}
                    {entrada.obs.length > 0 ? <span className={styles.obsNote}>{entrada.obs.join(" ")}</span> : null}
                  </Td>
                  <Td>{entrada.situacoes.map(abreviaSituacao).join(" · ")}</Td>
                  <Td>
                    <StatusBadge label={info.label} tone={info.tone} />
                  </Td>
                  <Td mono>
                    {valor > 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {fmtMoney(valor)}
                        {canEdit ? (
                          <button
                            type="button"
                            className={shared.iconButton}
                            title="Editar valor"
                            onClick={() => setEditandoCodigo(entrada.codigo)}
                          >
                            <Pencil size={12} />
                          </button>
                        ) : null}
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <em style={{ color: "var(--color-muted-light)", fontStyle: "italic" }}>A definir</em>
                        {canEdit ? (
                          <button
                            type="button"
                            className={shared.iconButton}
                            title="Editar valor"
                            onClick={() => setEditandoCodigo(entrada.codigo)}
                          >
                            <Pencil size={12} />
                          </button>
                        ) : null}
                      </span>
                    )}
                  </Td>
                  <Td>{entrada.cargos}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <div className={styles.criteriosGrid}>
        <div className={styles.criterioCard}>
          <div className={styles.criterioTitle}>ECG (0530) — critério de idade</div>
          <div className={styles.criterioText}>
            Somente para colaboradores a partir de 40 anos, ambos os sexos. Periódico a cada 12 meses. Não exigir abaixo de 40 anos.
          </div>
        </div>
        <div className={styles.criterioCard}>
          <div className={styles.criterioTitle}>Audiometria tonal (0281)</div>
          <div className={styles.criterioText}>
            Admissão, 6º mês após a admissão e periódico a cada 6 meses — apenas para cargos expostos a ruído.
          </div>
        </div>
        <div className={styles.criterioCard}>
          <div className={styles.criterioTitle}>Raio-X de coluna lombar (1410)</div>
          <div className={styles.criterioText}>Periódico a cada 24 meses (bienal) — diferente do intervalo anual padrão.</div>
        </div>
        <div className={styles.criterioCard}>
          <div className={styles.criterioTitle}>Grupo sanguíneo / fator RH (0673)</div>
          <div className={styles.criterioText}>Apenas no admissional (e mudança de risco/cargo). Coleta única, sem periodicidade.</div>
        </div>
      </div>

      <div className={styles.searchRow}>
        <SearchInput placeholder="Buscar cargo por nome ou CBO..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {grupos.length === 0 ? (
        <div className={shared.emptyInline}>Nenhum cargo encontrado para esta busca.</div>
      ) : (
        grupos.map(([ambiente, cargosDoGrupo]) => (
          <div key={ambiente} className={styles.ambienteSection}>
            <div className={styles.ambienteHeader}>
              <span className={styles.ambienteNome}>{titleCase(ambiente)}</span>
              <span className={styles.ambienteRule} />
              <span className={styles.ambienteCount}>{cargosDoGrupo.length} cargo(s)</span>
            </div>
            <div className={styles.cargoGrid}>
              {cargosDoGrupo.map((cargo) => (
                <CargoCard key={`${cargo.nome}-${cargo.cbo}`} cargo={cargo} />
              ))}
            </div>
          </div>
        ))
      )}

      <Card className={shared.futureCard}>
        <div className={shared.futureTitle}>Preparado para integração — sem automação nesta etapa</div>
        <div className={shared.futureSubtitle}>A matriz ocupacional está pronta para alimentar as próximas integrações do portal.</div>
        <div className={shared.futureList}>
          <div className={shared.futureItem}>
            <span className={shared.futureBullet}>›</span>
            <span>
              <strong>PeopleFlow:</strong> mudança de cargo recalculará automaticamente os riscos, EPIs e exames obrigatórios do
              colaborador nesta matriz.
            </span>
          </div>
          <div className={shared.futureItem}>
            <span className={shared.futureBullet}>›</span>
            <span>
              <strong>Academia MSB:</strong> os riscos ocupacionais de cada cargo poderão disparar treinamentos obrigatórios vinculados.
            </span>
          </div>
        </div>
      </Card>

      {showAddCargo ? <AdicionarCargoModal onClose={() => setShowAddCargo(false)} onSave={handleAddCargo} /> : null}

      {editandoCodigo && linhaEditando ? (
        <PriceEditModal
          title="Editar valor de exame"
          itemLabel={`${linhaEditando.codigo} · ${linhaEditando.nome}`}
          valor={precoEditando?.valor ?? 0}
          fornecedor={precoEditando?.fornecedor ?? ""}
          dataCotacao={precoEditando?.dataCotacao ?? ""}
          historico={precoEditando?.historico ?? []}
          onClose={() => setEditandoCodigo(null)}
          onSave={salvarPreco}
        />
      ) : null}
    </div>
  );
}

function CargoCard({ cargo }: { cargo: CargoOcupacional }) {
  return (
    <Card className={styles.cargoCard}>
      <div className={styles.cargoHeader}>
        <div className={styles.cargoNome}>{titleCase(cargo.nome)}</div>
        {cargo.cbo ? <span className={styles.cboBadge}>{cargo.cbo}</span> : null}
      </div>

      {cargo._addedBy ? (
        <span className={styles.addedPill}>
          Adicionado pelo RH · {cargo._addedBy}
          {cargo._ts ? ` em ${cargo._ts}` : ""}
        </span>
      ) : null}

      <div>
        <div className={styles.blockTitle}>Riscos ocupacionais</div>
        {cargo.riscos.length === 0 ? (
          <div className={styles.emptyNote}>Sem risco inventariado.</div>
        ) : (
          <div className={styles.riscoList}>
            {cargo.riscos.map((r, i) => (
              <div key={i} className={styles.riscoItem}>
                <span className={styles.categoriaBadge}>{r.categoria}</span>
                <span>
                  {r.agente}
                  {r.exposicao ? ` · ${r.exposicao}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className={styles.blockTitle}>EPIs aplicáveis</div>
        {cargo.epis.length === 0 ? (
          <div className={styles.emptyNote}>Não aplicável a este cargo.</div>
        ) : (
          <div className={styles.chipList}>
            {cargo.epis.map((e, i) => (
              <span key={i} className={styles.chip}>
                {e.epi}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className={styles.blockTitle}>Exames obrigatórios</div>
        {cargo.exames.length === 0 ? (
          <div className={styles.emptyNote}>Nenhum exame mapeado para este cargo.</div>
        ) : (
          <table className={styles.miniTable}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Exame</th>
                <th>Periodicidade</th>
              </tr>
            </thead>
            <tbody>
              {cargo.exames.map((e, i) => {
                const info = periodicidadeInfo(e.periodicidade);
                return (
                  <tr key={i}>
                    <td className="mono">{e.codigo || "—"}</td>
                    <td>{e.nome}</td>
                    <td>
                      <StatusBadge label={info.label} tone={info.tone} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
