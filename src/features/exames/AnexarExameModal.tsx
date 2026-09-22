import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, Select, TextInput } from "../../components/ui/Field";
import { ColaboradorPicker } from "./ColaboradorPicker";
import { examesDaMatrizParaTipo } from "../../domain/matriz";
import type { ExameMatrizEntry } from "../../domain/matriz";
import { procCode } from "../../domain/exameStatus";
import { addMonthsBR, isoToBR } from "../../domain/dates";
import { titleCase } from "../../domain/text";
import { tiposAso } from "./lib/exameUtils";
import type { CargoOcupacional, Colaborador, PrecoInfo } from "../../types/domain";

export interface AnexarExamePayload {
  colabId: number;
  proc: string;
  dataISO: string; // já convertido para dd/mm/aaaa
  proximo: string; // dd/mm/aaaa
  fornecedor: string;
  valor: number;
  file: File | null;
}

interface AnexarExameModalProps {
  colaboradores: Colaborador[];
  cargosOcupacionais: CargoOcupacional[];
  examePrecos: Record<string, PrecoInfo>;
  /** Quando informado, o colaborador vem travado (não pode ser trocado no modal). */
  initialColabId?: number;
  /** Quando informado junto de initialColabId, o exame específico também vem travado (sem seletor de tipo/exame). */
  initialProc?: string;
  /** Tipo de ASO pré-selecionado (ex.: "Demissional" ao vir do fluxo de desligamento) — o exame específico continua livre para escolha. */
  initialTipo?: string;
  onClose: () => void;
  onSave: (payload: AnexarExamePayload) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Modal de lançamento de realização de exame ocupacional — usado a partir do Controle de ASO,
 * de Próximos vencimentos e da ficha do colaborador, com três níveis de pré-preenchimento. */
export function AnexarExameModal({
  colaboradores,
  cargosOcupacionais,
  examePrecos,
  initialColabId,
  initialProc,
  initialTipo,
  onClose,
  onSave,
}: AnexarExameModalProps) {
  const colabLocked = initialColabId != null;
  const procLocked = !!initialProc;

  const [colabId, setColabId] = useState<number | null>(initialColabId ?? null);
  const [tipo, setTipo] = useState<string>(initialTipo ?? tiposAso()[0] ?? "Periódico");
  const [dataRealizadaIso, setDataRealizadaIso] = useState("");
  const [proximoBR, setProximoBR] = useState("");
  const [proximoTouched, setProximoTouched] = useState(false);
  const [fornecedor, setFornecedor] = useState("");
  const [valorInput, setValorInput] = useState("");
  const [valoresPorExame, setValoresPorExame] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [examesSelecionados, setExamesSelecionados] = useState<Set<string>>(new Set());
  const [lendoDocumento, setLendoDocumento] = useState(false);
  const [leituraInfo, setLeituraInfo] = useState<{ extraiu: boolean; qtd: number; motivoFalha?: string } | null>(null);

  const isDemissional = tipo === "Demissional" && !procLocked;

  const selectedColab = useMemo(() => colaboradores.find((c) => c.id === colabId) ?? null, [colaboradores, colabId]);

  const entries = useMemo<ExameMatrizEntry[]>(
    () => (selectedColab && !procLocked ? examesDaMatrizParaTipo(selectedColab, tipo, cargosOcupacionais) : []),
    [selectedColab, tipo, cargosOcupacionais, procLocked],
  );

  useEffect(() => {
    if (procLocked) return;
    setExamesSelecionados(new Set());
    setValoresPorExame({});
    setLeituraInfo(null);
  }, [entries, procLocked]);

  // Só relevante quando o exame já vem travado (initialProc) — o fluxo comum agora é a
  // lista de checkboxes abaixo, preenchida manualmente ou pela leitura do documento.
  const selectedEntry = useMemo<ExameMatrizEntry | null>(() => {
    if (!selectedColab || !procLocked || !initialProc) return null;
    for (const t of tiposAso()) {
      const found = examesDaMatrizParaTipo(selectedColab, t, cargosOcupacionais).find((e) => e.procStr === initialProc);
      if (found) return found;
    }
    const existente = selectedColab.exames.find((e) => e.proc === initialProc);
    return {
      key: initialProc,
      codigo: procCode(initialProc),
      nome: initialProc.replace(/^\(\d+\)\s*/, ""),
      procStr: initialProc,
      periodicidadeMeses: 12,
      jaTem: !!existente,
      ultimoAtual: existente?.ultimo ?? "—",
    };
  }, [selectedColab, procLocked, initialProc, cargosOcupacionais]);

  const primeiroExameSelecionado = useMemo(
    () => entries.find((e) => examesSelecionados.has(e.key)) ?? null,
    [entries, examesSelecionados],
  );

  // Valor sugerido a partir do catálogo — o fornecedor/clínica NÃO é sugerido de propósito:
  // o catálogo guarda um fornecedor "padrão", mas quem realizou o exame pode ter sido uma
  // clínica diferente, então esse campo sempre começa em branco para digitação manual.
  // Só se aplica ao caso de exame único travado — no fluxo com lista de checkboxes, cada
  // exame tem seu próprio valor (ver prefillValores()), já que um ASO com exames
  // complementares (ex.: clínica + exame de sangue) não tem o mesmo preço para todos.
  useEffect(() => {
    if (!procLocked || !selectedEntry?.codigo) return;
    const preco = examePrecos[selectedEntry.codigo];
    if (!preco?.valor) return;
    setValorInput((prev) => prev || String(preco.valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procLocked, selectedEntry?.codigo]);

  /** Preenche o valor de cada exame recém-marcado com o preço do catálogo (se houver e se
   * ainda não tiver um valor digitado) — nunca sobrescreve um valor que o RH já ajustou. */
  function prefillValores(keys: Iterable<string>) {
    setValoresPorExame((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        if (next[key] !== undefined) continue;
        const entry = entries.find((e) => e.key === key);
        const preco = entry?.codigo ? examePrecos[entry.codigo] : undefined;
        next[key] = preco?.valor ? String(preco.valor) : "";
      }
      return next;
    });
  }

  useEffect(() => {
    if (isDemissional || proximoTouched || !dataRealizadaIso) return;
    const entry = procLocked ? selectedEntry : primeiroExameSelecionado;
    if (!entry) return;
    setProximoBR(addMonthsBR(isoToBR(dataRealizadaIso), entry.periodicidadeMeses));
  }, [dataRealizadaIso, procLocked, selectedEntry, primeiroExameSelecionado, proximoTouched, isDemissional]);

  const canSubmit = procLocked
    ? colabId != null && !!selectedEntry && dataRealizadaIso.length > 0 && proximoBR.trim().length > 0 && proximoBR !== "—" && !enviando
    : colabId != null &&
      examesSelecionados.size > 0 &&
      dataRealizadaIso.length > 0 &&
      !enviando &&
      (isDemissional || (proximoBR.trim().length > 0 && proximoBR !== "—"));

  function toggleExame(key: string) {
    setExamesSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    prefillValores([key]);
  }

  function setValorExame(key: string, value: string) {
    setValoresPorExame((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!canSubmit || colabId == null) return;
    setEnviando(true);
    setErro(null);

    if (procLocked) {
      if (!selectedEntry) {
        setEnviando(false);
        return;
      }
      const result = await onSave({
        colabId,
        proc: selectedEntry.procStr,
        dataISO: isoToBR(dataRealizadaIso),
        proximo: proximoBR.trim(),
        fornecedor: fornecedor.trim(),
        valor: Number(String(valorInput).replace(",", ".")) || 0,
        file,
      });
      setEnviando(false);
      if (!result.ok) {
        setErro(result.error);
        return;
      }
      onClose();
      return;
    }

    // Um ou mais exames marcados (manualmente ou pela leitura automática do documento) —
    // cada um vira um registro próprio, com a mesma data/fornecedor/comprovante, mas com o
    // SEU PRÓPRIO valor (um ASO com exames complementares não tem o mesmo preço para todos).
    const proximoParaTodos = isDemissional ? "—" : proximoBR.trim();
    for (const entry of entries.filter((e) => examesSelecionados.has(e.key))) {
      const result = await onSave({
        colabId,
        proc: entry.procStr,
        dataISO: isoToBR(dataRealizadaIso),
        proximo: proximoParaTodos,
        fornecedor: fornecedor.trim(),
        valor: Number(String(valoresPorExame[entry.key] ?? "").replace(",", ".")) || 0,
        file,
      });
      if (!result.ok) {
        setEnviando(false);
        setErro(result.error);
        return;
      }
    }
    setEnviando(false);
    onClose();
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const novoArquivo = e.target.files?.[0] ?? null;
    setFile(novoArquivo);
    if (procLocked || !novoArquivo) {
      setLeituraInfo(null);
      return;
    }
    setLendoDocumento(true);
    setLeituraInfo(null);
    const { lerExamesDoDocumento } = await import("../../domain/lerDocumentoExame");
    const resultado = await lerExamesDoDocumento(novoArquivo, entries);
    setLendoDocumento(false);
    setLeituraInfo({ extraiu: resultado.extraiu, qtd: resultado.keysEncontradas.length, motivoFalha: resultado.motivoFalha });
    if (resultado.keysEncontradas.length > 0) {
      setExamesSelecionados(new Set(resultado.keysEncontradas));
      prefillValores(resultado.keysEncontradas);
    }
    if (resultado.dataRealizacaoIso && !dataRealizadaIso) setDataRealizadaIso(resultado.dataRealizacaoIso);
  }

  const rotuloBotao = procLocked ? "Anexar exame" : examesSelecionados.size > 1 ? "Anexar exames" : "Anexar exame";

  return (
    <Modal
      title="Anexar exame ocupacional"
      subtitle={selectedColab ? titleCase(selectedColab.nome) : "Selecione o colaborador"}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {enviando ? "Enviando..." : rotuloBotao}
          </Button>
        </>
      }
    >
      {colabLocked ? (
        <LabeledField label="Colaborador">
          <div style={{ fontWeight: 600, color: "var(--color-navy)" }}>
            {selectedColab ? titleCase(selectedColab.nome) : "—"}
            {selectedColab?.cargo ? <span style={{ fontWeight: 400, color: "var(--color-muted)" }}> · {titleCase(selectedColab.cargo)}</span> : null}
          </div>
        </LabeledField>
      ) : (
        <LabeledField label="Colaborador">
          <ColaboradorPicker colaboradores={colaboradores} value={colabId} onChange={setColabId} />
        </LabeledField>
      )}

      {selectedColab && procLocked ? (
        <LabeledField label="Exame">
          <div style={{ fontWeight: 600, color: "var(--color-navy)" }}>{selectedEntry?.procStr ?? "—"}</div>
        </LabeledField>
      ) : null}

      {selectedColab && !procLocked ? (
        <LabeledField label="Tipo de ASO">
          <Select options={tiposAso().map((t) => ({ value: t, label: t }))} value={tipo} onChange={(e) => setTipo(e.target.value)} />
        </LabeledField>
      ) : null}

      {selectedColab ? (
        <LabeledField label="Arquivo / comprovante (opcional)" hint={file ? `Selecionado: ${file.name}` : undefined}>
          <input type="file" onChange={handleFileChange} disabled={enviando || lendoDocumento} />
        </LabeledField>
      ) : null}

      {selectedColab && !procLocked ? (
        <LabeledField
          label="Exames realizados"
          hint={
            lendoDocumento
              ? "Lendo o documento..."
              : leituraInfo
                ? leituraInfo.extraiu
                  ? `${leituraInfo.qtd} exame(s) identificado(s) no documento — confira e ajuste se necessário.`
                  : `${leituraInfo.motivoFalha ?? "Não foi possível ler este arquivo automaticamente."} Selecione os exames realizados manualmente.`
                : "Anexe o documento acima para preencher automaticamente, ou selecione manualmente."
          }
        >
          {entries.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
              Nenhum exame mapeado na matriz ocupacional para este tipo de ASO — verifique o cargo do colaborador.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entries.map((e) => {
                const marcado = examesSelecionados.has(e.key);
                return (
                  <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flex: 1 }}>
                      <input type="checkbox" checked={marcado} onChange={() => toggleExame(e.key)} disabled={enviando} />
                      {e.procStr}
                      {e.jaTem ? <span style={{ color: "var(--color-muted)" }}> (já realizado antes)</span> : null}
                    </label>
                    {marcado ? (
                      <TextInput
                        inputMode="decimal"
                        value={valoresPorExame[e.key] ?? ""}
                        onChange={(ev) => setValorExame(e.key, ev.target.value)}
                        placeholder="0,00"
                        disabled={enviando}
                        style={{ width: 84, flex: "none" }}
                        title={`Valor de ${e.procStr}`}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </LabeledField>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: isDemissional ? "1fr" : "1fr 1fr", gap: 10 }}>
        <LabeledField label="Data de realização">
          <TextInput type="date" value={dataRealizadaIso} onChange={(e) => setDataRealizadaIso(e.target.value)} />
        </LabeledField>
        {!isDemissional ? (
          <LabeledField label="Próxima data prevista" hint="Calculada pela periodicidade — ajustável manualmente">
            <TextInput
              value={proximoBR}
              onChange={(e) => {
                setProximoTouched(true);
                setProximoBR(e.target.value);
              }}
              placeholder="dd/mm/aaaa"
            />
          </LabeledField>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: procLocked ? "1fr 1fr" : "1fr", gap: 10 }}>
        <LabeledField label="Fornecedor / clínica">
          <TextInput value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome da clínica" />
        </LabeledField>
        {procLocked ? (
          <LabeledField label="Valor do exame (R$)">
            <TextInput inputMode="decimal" value={valorInput} onChange={(e) => setValorInput(e.target.value)} placeholder="0,00" />
          </LabeledField>
        ) : null}
      </div>

      {erro && <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)" }}>{erro}</div>}
    </Modal>
  );
}
