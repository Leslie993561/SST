import { useState } from "react";
import type { ChangeEvent } from "react";
import { useRef } from "react";
import { FileDown, FileText, Upload } from "lucide-react";
import { StatusBadge } from "../../components/ui";
import type { Colaborador, EntregaEpi, FichaEntregaEpi } from "../../types/domain";
import { baixarFichaEntregaEpiPdf } from "../../domain/pdf/fichaEntregaEpi";
import { labelStatusFichaEpi, statusFichaEpi, toneStatusFichaEpi } from "../../domain/fichaAssinatura";
import { getFichaSignedUrl } from "../../repositories/fichasEpiRepository";
import { abrirAnexoUmaVez } from "../../domain/abrirArquivo";
import styles from "./FichaEpiControls.module.css";

interface FichaEpiControlsProps {
  ficha: FichaEntregaEpi;
  entregas: EntregaEpi[];
  colaborador: Colaborador | undefined;
  canEdit: boolean;
  onAnexarAssinatura: (file: File) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Controles de uma ficha de entrega já gerada — reabrir o PDF, anexar/ver a via assinada. */
export function FichaEpiControls({ ficha, entregas, colaborador, canEdit, onAnexarAssinatura }: FichaEpiControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  // Trava síncrona contra clique duplo — o estado abrindo só desabilita o
  // botão depois de um re-render, tarde demais pra barrar dois cliques bem
  // rápidos (ex.: duplo clique real), que abriam duas abas com o mesmo anexo.
  const abrindoRef = useRef(false);
  const status = statusFichaEpi(ficha);

  function handleVerPdf() {
    if (!colaborador) return;
    baixarFichaEntregaEpiPdf(entregas, colaborador, ficha);
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEnviando(true);
    setErro(null);
    const result = await onAnexarAssinatura(file);
    setEnviando(false);
    if (!result.ok) setErro(result.error);
  }

  async function handleVerAssinada() {
    if (!ficha.assinaturaStoragePath || abrindoRef.current) return;
    const storagePath = ficha.assinaturaStoragePath;
    abrindoRef.current = true;
    setAbrindo(true);
    try {
      const result = await abrirAnexoUmaVez(storagePath, () => getFichaSignedUrl(storagePath));
      if ("error" in result) setErro(`Falha ao gerar o link do arquivo: ${result.error}`);
    } finally {
      abrindoRef.current = false;
      setAbrindo(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <StatusBadge label={labelStatusFichaEpi(status)} tone={toneStatusFichaEpi(status)} />
      <button type="button" className={styles.actionButton} title="Gerar novamente o PDF desta ficha" onClick={handleVerPdf} disabled={!colaborador}>
        <FileDown size={12} /> Ver ficha (PDF)
      </button>
      {canEdit && status === "aguardando" ? (
        <>
          <button
            type="button"
            className={styles.actionButton}
            title="Anexar ficha assinada"
            onClick={() => fileInputRef.current?.click()}
            disabled={enviando}
          >
            <Upload size={12} /> {enviando ? "Enviando..." : "Anexar ficha assinada"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className={styles.hiddenInput}
            onChange={handleFileSelected}
          />
        </>
      ) : null}
      {ficha.assinaturaStoragePath ? (
        <button
          type="button"
          className={styles.viewLink}
          onClick={handleVerAssinada}
          disabled={abrindo}
          title={`Ver ${ficha.assinaturaFileName || "ficha assinada"}`}
        >
          <FileText size={12} /> {abrindo ? "Abrindo..." : "Ver ficha assinada"}
        </button>
      ) : null}
      {erro ? <span className={styles.erro}>{erro}</span> : null}
    </div>
  );
}
