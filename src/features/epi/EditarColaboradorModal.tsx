import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, TextInput } from "../../components/ui/Field";
import type { Colaborador } from "../../types/domain";

interface EditarColaboradorModalProps {
  colaborador: Colaborador;
  onClose: () => void;
  onSave: (dados: { cpf: string; nome: string; cargo: string; departamento: string; nascimento: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Completa/corrige o cadastro de um colaborador — em especial cpf e data de
 * nascimento, que o pré-cadastro automático vindo do Portal PeopleFlow (ao
 * concluir uma Admissão) não coleta, já que são exclusivos do SST. */
export function EditarColaboradorModal({ colaborador, onClose, onSave }: EditarColaboradorModalProps) {
  const [cpf, setCpf] = useState(colaborador.cpf || "");
  const [nome, setNome] = useState(colaborador.nome || "");
  const [cargo, setCargo] = useState(colaborador.cargo || "");
  const [departamento, setDepartamento] = useState(colaborador.departamento || "");
  const [nascimento, setNascimento] = useState(colaborador.nascimento || "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const cpfDigits = cpf.replace(/\D/g, "");
  const canSubmit = nome.trim().length > 0 && (cpfDigits.length === 0 || cpfDigits.length === 11) && !enviando;

  async function handleSubmit() {
    if (!canSubmit) return;
    setEnviando(true);
    setErro(null);
    const result = await onSave({ cpf: cpfDigits, nome: nome.trim(), cargo: cargo.trim(), departamento: departamento.trim(), nascimento });
    setEnviando(false);
    if (!result.ok) {
      setErro(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal
      title="Editar cadastro do colaborador"
      subtitle={colaborador.cpf ? colaborador.nome : `${colaborador.nome} · pré-cadastro do PeopleFlow, complete o CPF e a data de nascimento`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {enviando ? "Salvando..." : "Salvar"}
          </Button>
        </>
      }
    >
      <LabeledField label="Nome">
        <TextInput value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </LabeledField>
      <LabeledField label="CPF" hint="Só números — deixe em branco se ainda não tiver o CPF">
        <TextInput
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          inputMode="numeric"
        />
      </LabeledField>
      <LabeledField label="Data de nascimento">
        <TextInput type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
      </LabeledField>
      <LabeledField label="Cargo">
        <TextInput value={cargo} onChange={(e) => setCargo(e.target.value)} />
      </LabeledField>
      <LabeledField label="Departamento">
        <TextInput value={departamento} onChange={(e) => setDepartamento(e.target.value)} />
      </LabeledField>

      {erro && <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)" }}>{erro}</div>}
    </Modal>
  );
}
