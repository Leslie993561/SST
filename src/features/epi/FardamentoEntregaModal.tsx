import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, Select, TextInput } from "../../components/ui/Field";
import { isoToBR } from "../../domain/dates";
import { ColaboradorPicker } from "./ColaboradorPicker";
import type { Colaborador, PrecoInfo } from "../../types/domain";

const OUTRO_VALUE = "__outro__";

export interface FardamentoEntregaPayload {
  colabId: number;
  tipo: string;
  qtd: number;
  tamanho: string;
  valorUnit: number;
  fornecedor: string;
  dataEntrega: string;
  dataCompra: string;
  obs: string;
}

interface FardamentoEntregaModalProps {
  colaboradores: Colaborador[];
  tipoOptions: string[];
  fardamentoPrecos: Record<string, PrecoInfo>;
  onClose: () => void;
  onSave: (payload: FardamentoEntregaPayload) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Modal de registro de entrega de fardamento — independente da matriz de EPI. */
export function FardamentoEntregaModal({ colaboradores, tipoOptions, fardamentoPrecos, onClose, onSave }: FardamentoEntregaModalProps) {
  const [colabId, setColabId] = useState<number | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(tipoOptions[0] ?? OUTRO_VALUE);
  const [tipoCustom, setTipoCustom] = useState("");
  const [qtd, setQtd] = useState("1");
  const [tamanho, setTamanho] = useState("");
  const [valorUnit, setValorUnit] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [dataEntregaIso, setDataEntregaIso] = useState("");
  const [dataCompraIso, setDataCompraIso] = useState("");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tipoFinal = tipoSelecionado === OUTRO_VALUE ? tipoCustom.trim() : tipoSelecionado;

  function handleSelectTipo(value: string) {
    setTipoSelecionado(value);
    const sugerido = fardamentoPrecos[value]?.valor;
    if (sugerido != null) setValorUnit(String(sugerido));
    const fornecedorSugerido = fardamentoPrecos[value]?.fornecedor;
    if (fornecedorSugerido) setFornecedor(fornecedorSugerido);
  }

  const qtdNumerica = Number(qtd) || 0;
  const valorNumerico = Number(String(valorUnit).replace(",", ".")) || 0;
  const canSubmit = colabId != null && tipoFinal.length > 0 && qtdNumerica > 0 && dataEntregaIso.length > 0 && !enviando;

  async function handleSubmit() {
    if (!canSubmit || colabId == null) return;
    setEnviando(true);
    setErro(null);
    const result = await onSave({
      colabId,
      tipo: tipoFinal,
      qtd: qtdNumerica,
      tamanho: tamanho.trim(),
      valorUnit: valorNumerico,
      fornecedor: fornecedor.trim(),
      dataEntrega: isoToBR(dataEntregaIso),
      dataCompra: dataCompraIso ? isoToBR(dataCompraIso) : "—",
      obs: obs.trim(),
    });
    setEnviando(false);
    if (!result.ok) {
      setErro(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal
      title="Nova entrega de fardamento"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {enviando ? "Registrando..." : "Registrar entrega"}
          </Button>
        </>
      }
    >
      {erro ? <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)", marginBottom: 10 }}>{erro}</div> : null}
      <LabeledField label="Colaborador">
        <ColaboradorPicker colaboradores={colaboradores} value={colabId} onChange={setColabId} />
      </LabeledField>

      <LabeledField label="Tipo de fardamento">
        <Select
          options={[...tipoOptions.map((t) => ({ value: t, label: t })), { value: OUTRO_VALUE, label: "+ Outro (informar manualmente)" }]}
          value={tipoSelecionado}
          onChange={(e) => handleSelectTipo(e.target.value)}
        />
      </LabeledField>
      {tipoSelecionado === OUTRO_VALUE ? (
        <LabeledField label="Nome do tipo">
          <TextInput value={tipoCustom} onChange={(e) => setTipoCustom(e.target.value)} placeholder="Ex.: Jaqueta térmica" />
        </LabeledField>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Quantidade">
          <TextInput type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </LabeledField>
        <LabeledField label="Tamanho">
          <TextInput value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="Ex.: M, 42" />
        </LabeledField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Valor unitário (R$)">
          <TextInput inputMode="decimal" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} placeholder="0,00" />
        </LabeledField>
        <LabeledField label="Fornecedor">
          <TextInput value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome do fornecedor" />
        </LabeledField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Data de entrega">
          <TextInput type="date" value={dataEntregaIso} onChange={(e) => setDataEntregaIso(e.target.value)} />
        </LabeledField>
        <LabeledField label="Data de compra">
          <TextInput type="date" value={dataCompraIso} onChange={(e) => setDataCompraIso(e.target.value)} />
        </LabeledField>
      </div>

      <LabeledField label="Observações">
        <TextInput value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
      </LabeledField>
    </Modal>
  );
}
