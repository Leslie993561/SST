import { useMemo } from "react";
import { usePortalStore } from "../../store/PortalStoreContext";
import { portalRepository } from "../../repositories/portalRepository";
import { deptName, fmtMoney, titleCase } from "../../domain/text";
import { idadeFromISO, mesAbrev, mesISOfromBR, parseBR } from "../../domain/dates";
import { statusDoRegistro, toneForStatus } from "../../domain/exameStatus";
import type { ContextoIdadeExame } from "../../domain/exameStatus";
import type { BadgeTone } from "../../domain/exameStatus";
import { statusFichaEpi } from "../../domain/fichaAssinatura";
import { computeProgramaStatus, versoesMaisRecentes } from "../../domain/programaStatus";
import type { Colaborador, ExameRegistro } from "../../types/domain";

interface ExameFlat {
  colab: Colaborador;
  exame: ExameRegistro;
}

export interface RankedRow {
  nome: string;
  qtd: number;
  valorLabel: string;
  mediaLabel?: string;
  pct: string;
  _valor: number;
}

export function useDashboardData() {
  const { state } = usePortalStore();

  return useMemo(() => {
    const hoje = new Date();
    const colaboradoresAtivos = state.colaboradores.filter((c) => !state.desligados[c.id]);

    const catalogoExames = portalRepository.getMatrizOcupacional().catalogoExames;
    const contextoIdade = (colab: Colaborador): ContextoIdadeExame => ({
      idadeColab: idadeFromISO(colab.nascimento),
      catalogo: catalogoExames,
    });

    const exames: ExameFlat[] = [];
    colaboradoresAtivos.forEach((c) => (c.exames ?? []).forEach((exame) => exames.push({ colab: c, exame })));

    const statusCount = { "Em dia": 0, "A vencer": 0, Vencido: 0, "Necessita revisão": 0, Pendente: 0 };
    exames.forEach(({ colab, exame }) => {
      statusCount[statusDoRegistro(exame, hoje, contextoIdade(colab))]++;
    });

    const classificados = colaboradoresAtivos.filter((c) => c.epis && c.epis.length > 0).length;
    const totalExames = exames.length || 1;
    const pctEmDia = Math.round((100 * statusCount["Em dia"]) / totalExames);

    const pendenciaRows = exames
      .filter(({ colab, exame }) => {
        const st = statusDoRegistro(exame, hoje, contextoIdade(colab));
        return st === "Vencido" || st === "Necessita revisão";
      })
      .slice(0, 8)
      .map(({ colab, exame }) => {
        const status = statusDoRegistro(exame, hoje, contextoIdade(colab));
        const proxima = parseBR(exame.proximo);
        const diasAtraso = status === "Vencido" && proxima ? Math.round((hoje.getTime() - proxima.getTime()) / 86_400_000) : null;
        return {
          nome: titleCase(colab.nome),
          departamento: deptName(colab.departamento),
          item: exame.proc,
          vencimento: exame.proximo,
          diasAtraso,
          status,
          tone: toneForStatus(status) as BadgeTone,
        };
      });

    const kpi = {
      colaboradores: colaboradoresAtivos.length,
      classificados,
      asoEmDia: statusCount["Em dia"],
      aVencer: statusCount["A vencer"],
      pendencias: statusCount.Vencido + statusCount["Necessita revisão"],
    };

    // ---------- custos de EPI ----------
    const colabById = new Map(state.colaboradores.map((c) => [c.id, c]));
    const realizadoByMes: Record<string, number> = {};
    state.entregas.forEach((e) => {
      const mes = mesISOfromBR(e.dataEntrega);
      if (!mes) return;
      realizadoByMes[mes] = (realizadoByMes[mes] ?? 0) + e.valorUnit * e.qtd;
    });

    const custoMeses = state.custosEpi.map((r) => {
      const realizado = r.realizadoBase + (realizadoByMes[r.mes] ?? 0);
      const dif = realizado - r.orcado;
      const pctConsumo = r.orcado > 0 ? Math.round((100 * realizado) / r.orcado) : 0;
      const [ano, mes] = r.mes.split("-");
      return {
        mes: r.mes,
        mesLabel: `${mesAbrev(Number(mes))}/${ano.slice(2)}`,
        orcado: r.orcado,
        realizado,
        orcadoLabel: fmtMoney(r.orcado),
        realizadoLabel: fmtMoney(realizado),
        difLabel: `${dif >= 0 ? "+" : "−"} ${fmtMoney(Math.abs(dif))}`,
        difPositivo: dif > 0,
        pctLabel: `${pctConsumo}%`,
        pctTone: (pctConsumo > 100 ? "danger" : pctConsumo >= 90 ? "warning" : "success") as BadgeTone,
      };
    });
    const custoMaxVal = Math.max(1, ...custoMeses.map((m) => Math.max(m.orcado, m.realizado)));
    const custoBars = custoMeses.map((m) => ({
      label: m.mesLabel,
      a: m.orcado,
      b: m.realizado,
    }));
    const custoOrcAno = custoMeses.reduce((acc, m) => acc + m.orcado, 0);
    const custoRealAno = custoMeses.reduce((acc, m) => acc + m.realizado, 0);
    const custoDifAno = custoRealAno - custoOrcAno;
    const custoPctAno = custoOrcAno > 0 ? Math.round((100 * custoRealAno) / custoOrcAno) : 0;
    void custoMaxVal;

    function ranking(entries: Map<string, number>, counts: Map<string, number>, withMedia = false): RankedRow[] {
      const max = Math.max(1, ...entries.values());
      return [...entries.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([nome, valor]) => ({
          nome,
          qtd: counts.get(nome) ?? 0,
          valorLabel: fmtMoney(valor),
          mediaLabel: withMedia ? fmtMoney(valor / Math.max(1, counts.get(nome) ?? 1)) : undefined,
          pct: `${Math.round((100 * valor) / max)}%`,
          _valor: valor,
        }));
    }

    const epiValorByDept = new Map<string, number>();
    const epiQtdByDept = new Map<string, number>();
    const epiValorByColab = new Map<string, number>();
    const epiQtdByColab = new Map<string, number>();
    state.entregas.forEach((e) => {
      const c = colabById.get(e.colabId);
      const dept = deptName(c?.departamento);
      const nome = titleCase(c?.nome ?? "—");
      const valor = e.valorUnit * e.qtd;
      epiValorByDept.set(dept, (epiValorByDept.get(dept) ?? 0) + valor);
      epiQtdByDept.set(dept, (epiQtdByDept.get(dept) ?? 0) + e.qtd);
      epiValorByColab.set(nome, (epiValorByColab.get(nome) ?? 0) + valor);
      epiQtdByColab.set(nome, (epiQtdByColab.get(nome) ?? 0) + e.qtd);
    });

    const epiCustoDeptRows = ranking(epiValorByDept, epiQtdByDept, true);
    const epiCustoColabRows = ranking(epiValorByColab, epiQtdByColab);

    // ---------- custos de fardamento ----------
    const fardEntregaByMes: Record<string, number> = {};
    state.fardamentoEntregas.forEach((e) => {
      const mes = mesISOfromBR(e.dataEntrega);
      if (!mes) return;
      fardEntregaByMes[mes] = (fardEntregaByMes[mes] ?? 0) + e.valorUnit * e.qtd;
    });
    const fardReparoByMes: Record<string, number> = {};
    state.fardamentoReparos.forEach((r) => {
      const mes = mesISOfromBR(r.dataReparo);
      if (!mes) return;
      fardReparoByMes[mes] = (fardReparoByMes[mes] ?? 0) + r.valor;
    });

    const fardMeses = state.custosFardamento.map((r) => {
      const entrega = r.entregaBase + (fardEntregaByMes[r.mes] ?? 0);
      const reparo = r.reparoBase + (fardReparoByMes[r.mes] ?? 0);
      const realizado = entrega + reparo;
      const dif = realizado - r.orcado;
      const [ano, mes] = r.mes.split("-");
      return {
        mes: r.mes,
        mesLabel: `${mesAbrev(Number(mes))}/${ano.slice(2)}`,
        orcado: r.orcado,
        entrega,
        reparo,
        realizado,
        orcadoLabel: fmtMoney(r.orcado),
        entregaLabel: fmtMoney(entrega),
        reparoLabel: fmtMoney(reparo),
        realizadoLabel: fmtMoney(realizado),
        difLabel: `${dif >= 0 ? "+" : "−"} ${fmtMoney(Math.abs(dif))}`,
        difPositivo: dif > 0,
      };
    });
    const fardBars = fardMeses.map((m) => ({ mesLabel: m.mesLabel, orcado: m.orcado, entrega: m.entrega, reparo: m.reparo }));
    const fardEntAno = fardMeses.reduce((acc, m) => acc + m.entrega, 0);
    const fardRepAno = fardMeses.reduce((acc, m) => acc + m.reparo, 0);
    const fardOrcAno = fardMeses.reduce((acc, m) => acc + m.orcado, 0);
    const fardDifAno = fardEntAno + fardRepAno - fardOrcAno;

    const fardValorByDept = new Map<string, number>();
    const fardQtdByDept = new Map<string, number>();
    const fardValorByColab = new Map<string, number>();
    const fardQtdByColab = new Map<string, number>();
    state.fardamentoEntregas.forEach((e) => {
      const c = colabById.get(e.colabId);
      const dept = deptName(c?.departamento);
      const nome = titleCase(c?.nome ?? "—");
      const valor = e.valorUnit * e.qtd;
      fardValorByDept.set(dept, (fardValorByDept.get(dept) ?? 0) + valor);
      fardQtdByDept.set(dept, (fardQtdByDept.get(dept) ?? 0) + e.qtd);
      fardValorByColab.set(nome, (fardValorByColab.get(nome) ?? 0) + valor);
      fardQtdByColab.set(nome, (fardQtdByColab.get(nome) ?? 0) + e.qtd);
    });
    state.fardamentoReparos.forEach((r) => {
      const c = colabById.get(r.colabId);
      const dept = deptName(c?.departamento);
      const nome = titleCase(c?.nome ?? "—");
      fardValorByDept.set(dept, (fardValorByDept.get(dept) ?? 0) + r.valor);
      fardValorByColab.set(nome, (fardValorByColab.get(nome) ?? 0) + r.valor);
    });
    const fardCustoDeptRows = ranking(fardValorByDept, fardQtdByDept);
    const fardCustoColabRows = ranking(fardValorByColab, fardQtdByColab);

    // ---------- exames ocupacionais: previsto x realizado ----------
    const matrizOcup = portalRepository.getMatrizOcupacional();
    const catExames = matrizOcup.catalogoExames;
    const examesComValor = catExames.filter((e) => (state.examePrecos[e.codigo]?.valor ?? 0) > 0).length;
    const previstoExamesAno = catExames.reduce(
      (acc, e) => acc + (state.examePrecos[e.codigo]?.valor ?? 0) * (Number(e.cargos) || 0),
      0,
    );
    const realizadoExamesTotal = state.attachments.reduce((acc, a) => acc + (a.valor || 0), 0);
    const examesRealizadosCount = state.attachments.length;
    const difExamesSST = realizadoExamesTotal - previstoExamesAno;

    // ---------- fichas de entrega de EPI pendentes de assinatura ----------
    const totalFichasEpi = state.fichasEpi.length;
    const fichasAssinadas = state.fichasEpi.filter((f) => statusFichaEpi(f) === "assinada").length;
    const fichasAguardando = totalFichasEpi - fichasAssinadas;
    const entregasSemFicha = state.entregas.filter((e) => !e.fichaId).length;

    // ---------- desligamentos pendentes (solicitados no Portal PeopleFlow) ----------
    const colabPorNome = new Map(state.colaboradores.map((c) => [c.nome, c]));
    const desligamentosPendentesRows = state.desligamentosPendentes.flatMap((d) => {
      const colab = colabPorNome.get(d.colaboradorNome);
      if (!colab) return [];
      return [
        {
          colabId: colab.id,
          nome: titleCase(d.colaboradorNome),
          cargo: colab.cargo ? titleCase(colab.cargo) : "—",
          departamento: deptName(colab.departamento),
          dataDesligamento: d.dataDesligamento || "A definir",
          dataDesligamentoIso: d.dataDesligamentoIso,
          motivo: d.motivo,
          solicitadoPor: d.solicitadoPor,
        },
      ];
    });

    // ---------- ASO demissional pendente (criada aqui mesmo no SST) ----------
    const asoDemissionalPendentesRows = state.asoDemissionalPendentes.flatMap((p) => {
      const colab = state.colaboradores.find((c) => c.id === p.colabId);
      if (!colab) return [];
      return [
        {
          colabId: p.colabId,
          nome: titleCase(colab.nome),
          cargo: colab.cargo ? titleCase(colab.cargo) : "—",
          departamento: deptName(colab.departamento),
          desligadoEm: p.desligadoEm,
          motivo: p.motivo,
          solicitadoPor: p.solicitadoPor,
        },
      ];
    });

    // ---------- alerta de Programas de Saúde Ocupacional (PCMSO/PGR) ----------
    // Só lê `state.programasSaude` (novo, aditivo) — não toca em nenhum dos
    // cálculos de exames/EPI acima.
    const programasAtencao = versoesMaisRecentes(state.programasSaude)
      .map((v) => ({ programa: v.programa, status: computeProgramaStatus(v.vigenciaFim, v.precisaoFim) }))
      .filter((p) => p.status !== "Vigente");

    return {
      kpi,
      pctEmDia,
      programasAtencao,
      donutLegend: [
        { label: "Em dia", count: statusCount["Em dia"], color: "var(--color-brand)" },
        { label: "A vencer", count: statusCount["A vencer"], color: "var(--color-warning-bg)" },
        { label: "Vencido", count: statusCount.Vencido, color: "var(--color-danger-bg)" },
        { label: "Necessita revisão", count: statusCount["Necessita revisão"], color: "var(--color-purple-bg)" },
      ],
      pendenciaRows,
      custoMeses,
      custoBars,
      custoOrcAno,
      custoRealAno,
      custoDifAno,
      custoPctAno,
      epiCustoDeptRows,
      epiCustoColabRows,
      fardMeses,
      fardBars,
      fardEntAno,
      fardRepAno,
      fardOrcAno,
      fardDifAno,
      fardCustoDeptRows,
      fardCustoColabRows,
      sst: {
        previstoLabel: fmtMoney(previstoExamesAno),
        examesComValor,
        catExamesCount: catExames.length,
        realizadoLabel: fmtMoney(realizadoExamesTotal),
        examesRealizadosCount,
        difLabel: `${difExamesSST >= 0 ? "+" : "−"} ${fmtMoney(Math.abs(difExamesSST))}`,
        difPositivo: difExamesSST > 0,
        hasPrevisto: previstoExamesAno > 0,
      },
      fichasEpi: {
        total: totalFichasEpi,
        assinadas: fichasAssinadas,
        aguardando: fichasAguardando,
        semFicha: entregasSemFicha,
      },
      desligamentosPendentesRows,
      asoDemissionalPendentesRows,
    };
  }, [state]);
}
