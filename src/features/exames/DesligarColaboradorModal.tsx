import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, TextInput } from "../../components/ui/Field";

interface DesligarColaboradorModalProps {
  colaboradorNome: string;
  onClose: () => void;
  /** Pré-preenche data/motivo quando a solicitação já veio do Portal PeopleFlow (ver desligamentosPendentes). */
  initialDataIso?: string;
  initialMotivo?: string;
  /** precisaExameDemissional: resposta "Sim" à pergunta dos 90 dias — quem chama decide o que fazer com isso (ex.: abrir o anexo de exame demissional). */
  onConfirm: (dataIso: string, motivo: string, precisaExameDemissional: boolean) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Confirmação de desligamento — a partir deste ponto o colaborador some das listas ativas do portal. */
export function DesligarColaboradorModal({ colaboradorNome, onClose, initialDataIso, initialMotivo, onConfirm }: DesligarColaboradorModalProps) {
  const [dataIso, setDataIso] = useState(initialDataIso ?? "");
  const [motivo, setMotivo] = useState(initialMotivo ?? "");
  const [mais90Dias, setMais90Dias] = useState<"sim" | "nao" | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const canSubmit = dataIso.length > 0 && motivo.trim().length > 0 && mais90Dias !== null && !enviando;

  async function handleSubmit() {
    if (!canSubmit || mais90Dias === null) return;
    setEnviando(true);
    setErro(null);
    const result = await onConfirm(dataIso, motivo.trim(), mais90Dias === "sim");
    setEnviando(false);
    if (!result.ok) {
      setErro(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal
      title="Desligar colaborador"
      subtitle={colaboradorNome}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="danger" disabled={!canSubmit} onClick={handleSubmit}>
            {enviando ? "Confirmando..." : "Confirmar desligamento"}
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 12.5, color: "var(--color-muted)", lineHeight: 1.6, marginBottom: 4 }}>
        Ao confirmar, este colaborador deixa de aparecer nas listas ativas de exames em todo o portal e passa a constar apenas na aba
        Desligados, com seu histórico preservado. Também passa a aparecer no Portal PeopleFlow, na aba Desligados.
      </div>

      {initialMotivo ? (
        <div style={{ fontSize: 12, color: "var(--color-navy)", background: "var(--color-brand-pale)", borderRadius: 10, padding: "9px 12px" }}>
          Data e motivo pré-preenchidos a partir da movimentação de desligamento aprovada no Portal PeopleFlow — revise antes de confirmar.
        </div>
      ) : null}

      <LabeledField label="Data de desligamento">
        <TextInput type="date" value={dataIso} onChange={(e) => setDataIso(e.target.value)} />
      </LabeledField>
      <LabeledField label="Motivo">
        <TextInput value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Pedido de demissão, término de contrato..." />
      </LabeledField>

      <LabeledField label="Colaborador possui mais de 90 dias?" hint="Define se é preciso anexar o exame demissional antes de encerrar o fluxo.">
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="button"
            variant={mais90Dias === "sim" ? "primary" : "secondary"}
            onClick={() => setMais90Dias("sim")}
            style={{ flex: 1 }}
          >
            Sim
          </Button>
          <Button
            type="button"
            variant={mais90Dias === "nao" ? "primary" : "secondary"}
            onClick={() => setMais90Dias("nao")}
            style={{ flex: 1 }}
          >
            Não
          </Button>
        </div>
      </LabeledField>

      {mais90Dias === "sim" && (
        <div style={{ fontSize: 12, color: "var(--color-navy)", background: "var(--color-brand-pale)", borderRadius: 10, padding: "9px 12px", marginTop: 4 }}>
          Ao confirmar, a tela de anexar exame demissional abre automaticamente em seguida.
        </div>
      )}

      {erro && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)" }}>{erro}</div>
      )}
    </Modal>
  );
}
