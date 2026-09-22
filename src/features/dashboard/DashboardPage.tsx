import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ClipboardCheck, FileCheck2, FileSignature, ShieldCheck, TriangleAlert, UserMinus, Users } from "lucide-react";
import { Card, DonutChart, GroupedBarChart, KpiCard, SegmentedControl, StatusBadge, Table, Td, Th, THead, Tr } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { ExameFichaDrawer } from "../exames/ExameFichaDrawer";
import { useDashboardData } from "./useDashboardData";
import styles from "./DashboardPage.module.css";

type CustoView = "mes" | "dept" | "colab";

export function DashboardPage() {
  const { canEdit } = useAuth();
  const data = useDashboardData();
  const [custoEpiView, setCustoEpiView] = useState<CustoView>("mes");
  const [custoFardView, setCustoFardView] = useState<CustoView>("mes");
  const [resolvendoPendente, setResolvendoPendente] = useState<{ colabId: number; dataIso: string; motivo: string } | null>(null);
  const [resolvendoAsoPendente, setResolvendoAsoPendente] = useState<number | null>(null);

  return (
    <div className={styles.page}>
      {/* desligamento pendente — solicitado no Portal PeopleFlow */}
      {canEdit && data.desligamentosPendentesRows.length > 0 ? (
        <Card className={[styles.sectionCard, styles.pendenteDesligamentoCard].join(" ")}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>
                <UserMinus size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
                Desligamento pendente
              </div>
              <div className={styles.sectionSubtitle}>
                Aprovado no Portal PeopleFlow — falta efetivar aqui (anexar o ASO demissional, se aplicável, e confirmar).
              </div>
            </div>
          </div>
          <Table>
            <THead>
              <Th>Colaborador</Th>
              <Th>Cargo</Th>
              <Th>Departamento</Th>
              <Th>Data prevista</Th>
              <Th>Motivo</Th>
              <Th>Solicitado por</Th>
            </THead>
            <tbody>
              {data.desligamentosPendentesRows.map((row) => (
                <Tr
                  key={row.colabId}
                  onClick={() => setResolvendoPendente({ colabId: row.colabId, dataIso: row.dataDesligamentoIso, motivo: row.motivo })}
                >
                  <Td>
                    <strong>{row.nome}</strong>
                  </Td>
                  <Td>{row.cargo}</Td>
                  <Td>{row.departamento}</Td>
                  <Td mono>{row.dataDesligamento}</Td>
                  <Td>{row.motivo}</Td>
                  <Td>{row.solicitadoPor}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {/* ASO demissional pendente — confirmado aqui mesmo no SST, falta anexar o exame */}
      {canEdit && data.asoDemissionalPendentesRows.length > 0 ? (
        <Card className={[styles.sectionCard, styles.pendenteDesligamentoCard].join(" ")}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>
                <FileSignature size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
                ASO demissional pendente
              </div>
              <div className={styles.sectionSubtitle}>
                Desligamento confirmado com mais de 90 dias — falta anexar o exame demissional na ficha do colaborador.
              </div>
            </div>
          </div>
          <Table>
            <THead>
              <Th>Colaborador</Th>
              <Th>Cargo</Th>
              <Th>Departamento</Th>
              <Th>Desligado em</Th>
              <Th>Motivo</Th>
              <Th>Registrado por</Th>
            </THead>
            <tbody>
              {data.asoDemissionalPendentesRows.map((row) => (
                <Tr key={row.colabId} onClick={() => setResolvendoAsoPendente(row.colabId)}>
                  <Td>
                    <strong>{row.nome}</strong>
                  </Td>
                  <Td>{row.cargo}</Td>
                  <Td>{row.departamento}</Td>
                  <Td mono>{row.desligadoEm}</Td>
                  <Td>{row.motivo}</Td>
                  <Td>{row.solicitadoPor}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {/* Programas de Saúde Ocupacional (PCMSO/PGR) próximos do vencimento ou vencidos —
          só lê data.programasAtencao (novo, aditivo); não altera os KPIs abaixo. */}
      {canEdit && data.programasAtencao.length > 0 ? (
        <Card className={[styles.sectionCard, styles.pendenteDesligamentoCard].join(" ")}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>
                <FileCheck2 size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
                Programas de Saúde Ocupacional — atenção necessária
              </div>
              <div className={styles.sectionSubtitle}>
                {data.programasAtencao.map((p) => `${p.programa}: ${p.status}`).join(" · ")} — ver detalhes e histórico em
              </div>
            </div>
            <Link to="/programas" className={styles.link}>
              Ver Programas de SST →
            </Link>
          </div>
        </Card>
      ) : null}

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KpiCard icon={<Users size={18} />} value={data.kpi.colaboradores} label="Colaboradores na base" />
        <KpiCard icon={<ShieldCheck size={18} />} value={data.kpi.classificados} label="Com matriz de EPI" />
        <KpiCard icon={<ClipboardCheck size={18} />} value={data.kpi.asoEmDia} label="Exames em dia" tone="success" />
        <KpiCard icon={<CalendarClock size={18} />} value={data.kpi.aVencer} label="A vencer (60 dias)" tone="warning" />
        <KpiCard
          icon={<TriangleAlert size={18} />}
          value={data.kpi.pendencias}
          label="Vencidos + revisão"
          tone="danger"
          highlighted
        />
      </div>

      {/* conformidade */}
      <Card className={styles.sectionCard}>
        <div className={styles.sectionTitle}>Conformidade de ASO</div>
        <div className={styles.conformidadeRow}>
          <DonutChart percent={data.pctEmDia} label="em dia" />
          <div className={styles.legend}>
            {data.donutLegend.map((item) => (
              <div key={item.label} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: item.color }} />
                {item.label} · {item.count}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* fichas de EPI pendentes de assinatura — controle interno do RH */}
      {canEdit ? (
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Fichas de EPI pendentes de assinatura</div>
              <div className={styles.sectionSubtitle}>Controle do RH — acompanhamento das fichas de entrega geradas e assinadas.</div>
            </div>
          </div>
          <div className={styles.kpiGrid}>
            <KpiCard icon={<Users size={18} />} value={data.fichasEpi.total} label="Fichas geradas" />
            <KpiCard icon={<FileSignature size={18} />} value={data.fichasEpi.assinadas} label="Fichas assinadas" tone="success" />
            <KpiCard icon={<CalendarClock size={18} />} value={data.fichasEpi.aguardando} label="Aguardando assinatura" tone="warning" />
            <KpiCard icon={<TriangleAlert size={18} />} value={data.fichasEpi.semFicha} label="Entregas sem ficha ainda" tone="danger" />
          </div>
        </Card>
      ) : null}

      {/* pendências */}
      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Pendências que exigem ação</div>
          <Link to="/exames" className={styles.link}>
            Ver exames →
          </Link>
        </div>
        {data.pendenciaRows.length === 0 ? (
          <div className={styles.emptyInline}>Nenhuma pendência no momento — base em conformidade.</div>
        ) : (
          <Table>
            <THead>
              <Th>Colaborador</Th>
              <Th>Departamento</Th>
              <Th>Exame</Th>
              <Th>Próxima data</Th>
              <Th>Dias em atraso</Th>
              <Th>Status</Th>
            </THead>
            <tbody>
              {data.pendenciaRows.map((row, i) => (
                <Tr key={i}>
                  <Td>
                    <strong>{row.nome}</strong>
                  </Td>
                  <Td>{row.departamento}</Td>
                  <Td>{row.item}</Td>
                  <Td mono>{row.vencimento}</Td>
                  <Td mono>{row.diasAtraso != null ? row.diasAtraso : "—"}</Td>
                  <Td>
                    <StatusBadge label={row.status} tone={row.tone} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* custos de EPI */}
      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Custos de EPI · realizado × orçado</div>
            <div className={styles.sectionSubtitle}>Acompanhamento mensal de consumo — realizado alimentado pelas entregas registradas.</div>
          </div>
          <div className={styles.summaryRow}>
            <SummaryStat label="Orçado (ano)" value={money(data.custoOrcAno)} />
            <SummaryStat label="Realizado (ano)" value={money(data.custoRealAno)} />
            <SummaryStat label="Diferença" value={diffLabel(data.custoDifAno)} tone={data.custoDifAno > 0 ? "danger" : "success"} />
            <SummaryStat label="Consumo" value={`${data.custoPctAno}%`} />
          </div>
        </div>

        <GroupedBarChart groups={data.custoBars} legendA="Orçado" legendB="Realizado" />

        <div className={styles.segmentedRow}>
          <SegmentedControl
            items={[
              { key: "mes", label: "Por mês" },
              { key: "dept", label: "Por departamento" },
              { key: "colab", label: "Por colaborador" },
            ]}
            active={custoEpiView}
            onChange={(k) => setCustoEpiView(k as CustoView)}
          />
        </div>

        {custoEpiView === "mes" ? (
          <Table>
            <THead>
              <Th>Mês</Th>
              <Th>Orçado</Th>
              <Th>Realizado</Th>
              <Th>Diferença</Th>
              <Th>% consumo</Th>
            </THead>
            <tbody>
              {data.custoMeses.map((m) => (
                <Tr key={m.mes}>
                  <Td>
                    <strong>{m.mesLabel}</strong>
                  </Td>
                  <Td mono>{m.orcadoLabel}</Td>
                  <Td mono>
                    <strong>{m.realizadoLabel}</strong>
                  </Td>
                  <Td mono>
                    <span className={m.difPositivo ? styles.negative : styles.positive}>{m.difLabel}</span>
                  </Td>
                  <Td>
                    <StatusBadge label={m.pctLabel} tone={m.pctTone} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <RankingTable rows={custoEpiView === "dept" ? data.epiCustoDeptRows : data.epiCustoColabRows} showMedia={custoEpiView === "dept"} />
        )}
      </Card>

      {/* custos de fardamento */}
      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Custos de Fardamento · entregas + reparos × orçado</div>
            <div className={styles.sectionSubtitle}>Acompanhamento mensal — realizado alimentado pelas entregas e reparos registrados.</div>
          </div>
          <div className={styles.summaryRow}>
            <SummaryStat label="Entregas (ano)" value={money(data.fardEntAno)} />
            <SummaryStat label="Reparos (ano)" value={money(data.fardRepAno)} tone="warning" />
            <SummaryStat label="Orçado (ano)" value={money(data.fardOrcAno)} />
            <SummaryStat label="Diferença" value={diffLabel(data.fardDifAno)} tone={data.fardDifAno > 0 ? "danger" : "success"} />
          </div>
        </div>

        <div className={styles.segmentedRow}>
          <SegmentedControl
            items={[
              { key: "mes", label: "Por mês" },
              { key: "dept", label: "Por departamento" },
              { key: "colab", label: "Por colaborador" },
            ]}
            active={custoFardView}
            onChange={(k) => setCustoFardView(k as CustoView)}
          />
        </div>

        {custoFardView === "mes" ? (
          <Table>
            <THead>
              <Th>Mês</Th>
              <Th>Entregas</Th>
              <Th>Reparos</Th>
              <Th>Realizado</Th>
              <Th>Orçado</Th>
              <Th>Diferença</Th>
            </THead>
            <tbody>
              {data.fardMeses.map((m) => (
                <Tr key={m.mes}>
                  <Td>
                    <strong>{m.mesLabel}</strong>
                  </Td>
                  <Td mono>{m.entregaLabel}</Td>
                  <Td mono>{m.reparoLabel}</Td>
                  <Td mono>
                    <strong>{m.realizadoLabel}</strong>
                  </Td>
                  <Td mono>{m.orcadoLabel}</Td>
                  <Td mono>
                    <span className={m.difPositivo ? styles.negative : styles.positive}>{m.difLabel}</span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <RankingTable rows={custoFardView === "dept" ? data.fardCustoDeptRows : data.fardCustoColabRows} />
        )}
      </Card>

      {/* exames previsto x realizado */}
      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Exames ocupacionais · previsto × realizado</div>
            <div className={styles.sectionSubtitle}>
              Previsto a partir do valor do exame na matriz ocupacional (× cargos); realizado a partir dos exames lançados nas fichas.
            </div>
          </div>
          <StatusBadge label="Base preparada" tone="purple" />
        </div>
        <div className={styles.sstGrid}>
          <div className={styles.sstBox}>
            <div className={styles.sstLabel}>Previsto estimado (matriz)</div>
            <div className={styles.sstValue}>{data.sst.previstoLabel}</div>
            <div className={styles.sstHint}>
              {data.sst.examesComValor} de {data.sst.catExamesCount} exames com valor cadastrado
            </div>
          </div>
          <div className={styles.sstBox}>
            <div className={styles.sstLabel}>Realizado (exames lançados)</div>
            <div className={styles.sstValue}>{data.sst.realizadoLabel}</div>
            <div className={styles.sstHint}>{data.sst.examesRealizadosCount} exame(s) com valor realizado</div>
          </div>
          <div className={styles.sstBox}>
            <div className={styles.sstLabel}>Diferença</div>
            <div className={data.sst.difPositivo ? styles.negative : styles.positive}>{data.sst.difLabel}</div>
            <div className={styles.sstHint}>realizado − previsto</div>
          </div>
        </div>
        {data.sst.hasPrevisto ? (
          <div className={styles.sstNote}>
            Comparativo preparado para evolução: o previsto acompanha o valor cadastrado na Matriz Ocupacional e o realizado acompanha os
            valores lançados nos exames.
          </div>
        ) : (
          <div className={styles.sstWarn}>
            Cadastre o valor do exame na aba <Link to="/exames/matriz-ocupacional">Exames → Matriz ocupacional</Link> para alimentar o
            valor previsto deste comparativo.
          </div>
        )}
      </Card>

      {resolvendoPendente ? (
        <ExameFichaDrawer
          colabId={resolvendoPendente.colabId}
          abrirDesligarPendente={{ dataIso: resolvendoPendente.dataIso, motivo: resolvendoPendente.motivo }}
          onClose={() => setResolvendoPendente(null)}
        />
      ) : null}

      {resolvendoAsoPendente != null ? (
        <ExameFichaDrawer colabId={resolvendoAsoPendente} onClose={() => setResolvendoAsoPendente(null)} />
      ) : null}
    </div>
  );
}

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diffLabel(v: number) {
  return `${v >= 0 ? "+" : "−"} ${money(Math.abs(v))}`;
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" | "warning" }) {
  return (
    <div className={styles.summaryStat}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={tone === "danger" ? styles.negative : tone === "success" ? styles.positive : styles.summaryValue}>{value}</div>
    </div>
  );
}

function RankingTable({
  rows,
  showMedia = false,
}: {
  rows: { nome: string; qtd: number; valorLabel: string; mediaLabel?: string; pct: string }[];
  showMedia?: boolean;
}) {
  if (rows.length === 0) {
    return <div className={styles.emptyInline}>Sem lançamentos registrados ainda.</div>;
  }
  return (
    <Table>
      <THead>
        <Th>Nome</Th>
        <Th>Quantidade</Th>
        <Th>Custo total</Th>
        {showMedia ? <Th>Custo médio</Th> : null}
        <Th>Participação</Th>
      </THead>
      <tbody>
        {rows.map((r) => (
          <Tr key={r.nome}>
            <Td>
              <strong>{r.nome}</strong>
            </Td>
            <Td>{r.qtd}</Td>
            <Td mono>
              <strong>{r.valorLabel}</strong>
            </Td>
            {showMedia ? <Td mono>{r.mediaLabel}</Td> : null}
            <Td>
              <div className={styles.pctBarTrack}>
                <div className={styles.pctBarFill} style={{ width: r.pct }} />
              </div>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
