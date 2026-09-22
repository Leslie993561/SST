import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import type { EntregaEpi } from "../../types/domain";

interface ExcluirEntregaEpiModalProps {
  entrega: EntregaEpi;
  onClose: () => void;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Confirmação antes de excluir uma entrega de EPI já registrada — ação irreversível. */
export function ExcluirEntregaEpiModal({ entrega, onClose, onConfirm }: ExcluirEntregaEpiModalProps) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleConfirm() {
    setEnviando(true);
    setErro(null);
    const result = await onConfirm();
    setEnviando(false);
    if (!result.ok) {
      setErro(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal
      title="Excluir entrega de EPI"
      subtitle={`${entrega.epi} · ${entrega.dataEntrega}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={enviando}>
            {enviando ? "Excluindo..." : "Excluir entrega"}
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 12.5, color: "var(--color-muted)", lineHeight: 1.6 }}>
        Esta ação remove o registro de entrega de <strong style={{ color: "var(--color-navy)" }}>{entrega.epi}</strong> (qtd {entrega.qtd},
        entregue em {entrega.dataEntrega}) e não pode ser desfeita. Se a ficha já tiver sido gerada ou assinada, os documentos anexados a
        este registro também deixam de ficar acessíveis.
      </div>

      {erro && <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)" }}>{erro}</div>}
    </Modal>
  );
}
