import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, TextInput } from "../../components/ui/Field";
import type { CargoOcupacional } from "../../types/domain";

interface AdicionarCargoModalProps {
  onClose: () => void;
  onSave: (cargo: CargoOcupacional) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Cadastro mínimo de um novo cargo na matriz ocupacional — riscos/EPIs/exames detalhados ficam
 * para uma etapa futura de autoria completa; aqui o RH apenas registra a existência do cargo. */
export function AdicionarCargoModal({ onClose, onSave }: AdicionarCargoModalProps) {
  const [nome, setNome] = useState("");
  const [cbo, setCbo] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const canSubmit = nome.trim().length > 0 && !enviando;

  async function handleSubmit() {
    if (!canSubmit) return;
    setEnviando(true);
    setErro(null);
    const result = await onSave({
      nome: nome.trim(),
      cbo: cbo.trim(),
      ambiente: ambiente.trim() || "Sem classificação",
      riscos: [],
      epis: [],
      exames: [],
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
      title="Adicionar cargo à matriz ocupacional"
      subtitle="Cadastro mínimo — riscos, EPIs e exames podem ser detalhados posteriormente pelo PCMSO/PGR"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {enviando ? "Adicionando..." : "Adicionar cargo"}
          </Button>
        </>
      }
    >
      {erro ? <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)", marginBottom: 10 }}>{erro}</div> : null}
      <LabeledField label="Nome do cargo">
        <TextInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Auxiliar de Enfermagem" autoFocus />
      </LabeledField>
      <LabeledField label="CBO">
        <TextInput value={cbo} onChange={(e) => setCbo(e.target.value)} placeholder="Ex.: 3222-05" />
      </LabeledField>
      <LabeledField label="Ambiente">
        <TextInput value={ambiente} onChange={(e) => setAmbiente(e.target.value)} placeholder="Ex.: Administrativo, Hospitalar..." />
      </LabeledField>
    </Modal>
  );
}
