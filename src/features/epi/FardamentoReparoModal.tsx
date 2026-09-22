import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, TextInput } from "../../components/ui/Field";
import { isoToBR } from "../../domain/dates";
import { ColaboradorPicker } from "./ColaboradorPicker";
import type { Colaborador } from "../../types/domain";

export interface FardamentoReparoPayload {
  colabId: number;
  peca: string;
  tipoReparo: string;
  valor: number;
  fornecedor: string;
  dataReparo: string;
  obs: string;
}

interface FardamentoReparoModalProps {
  colaboradores: Colaborador[];
  onClose: () => void;
  onSave: (payload: FardamentoReparoPayload) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Modal de registro de reparo de fardamento — cada lançamento é um registro independente. */
export function FardamentoReparoModal({ colaboradores, onClose, onSave }: FardamentoReparoModalProps) {
  const [colabId, setColabId] = useState<number | null>(null);
  const [peca, setPeca] = useState("");
  const [tipoReparo, setTipoReparo] = useState("");
  const [valor, setValor] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [dataReparoIso, setDataReparoIso] = useState("");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valorNumerico = Number(String(valor).replace(",", ".")) || 0;
  const canSubmit = colabId != null && peca.trim().length > 0 && tipoReparo.trim().length > 0 && dataReparoIso.length > 0 && !enviando;

  async function handleSubmit() {
    if (!canSubmit || colabId == null) return;
    setEnviando(true);
    setErro(null);
    const result = await onSave({
      colabId,
      peca: peca.trim(),
      tipoReparo: tipoReparo.trim(),
      valor: valorNumerico,
      fornecedor: fornecedor.trim(),
      dataReparo: isoToBR(dataReparoIso),
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
      title="Novo reparo de fardamento"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {enviando ? "Registrando..." : "Registrar reparo"}
          </Button>
        </>
      }
    >
      {erro ? <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)", marginBottom: 10 }}>{erro}</div> : null}
      <LabeledField label="Colaborador">
        <ColaboradorPicker colaboradores={colaboradores} value={colabId} onChange={setColabId} />
      </LabeledField>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Peça">
          <TextInput value={peca} onChange={(e) => setPeca(e.target.value)} placeholder="Ex.: Conjunto de Helanca" />
        </LabeledField>
        <LabeledField label="Tipo de reparo">
          <TextInput value={tipoReparo} onChange={(e) => setTipoReparo(e.target.value)} placeholder="Ex.: Troca de zíper" />
        </LabeledField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Valor (R$)">
          <TextInput inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
        </LabeledField>
        <LabeledField label="Prestador / fornecedor">
          <TextInput value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome do prestador" />
        </LabeledField>
      </div>

      <LabeledField label="Data do reparo">
        <TextInput type="date" value={dataReparoIso} onChange={(e) => setDataReparoIso(e.target.value)} />
      </LabeledField>

      <LabeledField label="Observações">
        <TextInput value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
      </LabeledField>
    </Modal>
  );
}
