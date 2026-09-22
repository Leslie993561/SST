import { useState } from "react";
import { Modal, Button, LabeledField } from "../../components/ui";
import { lerVigenciaDoDocumento, extrairVigenciaDeTextoExistente, type VigenciaExtraida } from "../../domain/lerDocumentoPrograma";
import type { NomePrograma, PrecisaoData } from "../../types/domain";
import styles from "./RegistrarVersaoModal.module.css";

interface RegistrarVersaoModalProps {
  programa: NomePrograma;
  /** Quando informado, pula a etapa de upload e já parte da extração feita a
   * partir do texto que já estava cadastrado na matriz (caso dos dois
   * programas atuais, que ainda não têm PDF anexado no portal). */
  extracaoInicial?: { vigencia: VigenciaExtraida | null; descricao: string };
  onClose: () => void;
  onSave: (input: {
    descricao: string;
    vigenciaInicio: string;
    vigenciaFim: string;
    precisaoFim: PrecisaoData;
    origem: string;
    file: File | null;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export function RegistrarVersaoModal({ programa, extracaoInicial, onClose, onSave }: RegistrarVersaoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [motivoFalhaLeitura, setMotivoFalhaLeitura] = useState<string | null>(null);
  const [trecho, setTrecho] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<"upload" | "conferencia">(extracaoInicial ? "conferencia" : "upload");

  const [descricao, setDescricao] = useState(extracaoInicial?.descricao ?? "");
  const [precisao, setPrecisao] = useState<PrecisaoData>(extracaoInicial?.vigencia?.precisao ?? "dia");
  const [vigenciaInicio, setVigenciaInicio] = useState(extracaoInicial?.vigencia?.vigenciaInicio ?? "");
  const [vigenciaFim, setVigenciaFim] = useState(extracaoInicial?.vigencia?.vigenciaFim ?? "");
  const [origem, setOrigem] = useState(extracaoInicial ? "Texto já cadastrado na matriz ocupacional" : "");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleFile(f: File) {
    setFile(f);
    setLendo(true);
    setMotivoFalhaLeitura(null);
    setTrecho(null);
    const resultado = await lerVigenciaDoDocumento(f);
    setLendo(false);
    setOrigem(f.name);
    if (!resultado.extraiu) {
      setMotivoFalhaLeitura(resultado.motivoFalha ?? "Não consegui ler o documento.");
      setEtapa("conferencia");
      return;
    }
    if (resultado.vigencia) {
      setPrecisao(resultado.vigencia.precisao);
      setVigenciaInicio(resultado.vigencia.vigenciaInicio);
      setVigenciaFim(resultado.vigencia.vigenciaFim);
      setTrecho(resultado.vigencia.trecho);
    } else {
      setMotivoFalhaLeitura(resultado.motivoFalha ?? "Não encontrei uma vigência clara — informe manualmente.");
    }
    if (!descricao) {
      // Tenta reaproveitar o mesmo trecho como ponto de partida da descrição —
      // o RH pode ajustar livremente antes de salvar.
      const vig = extrairVigenciaDeTextoExistente(resultado.textoCompleto);
      if (vig) setTrecho(vig.trecho);
    }
    setEtapa("conferencia");
  }

  async function handleConfirmar() {
    setErro(null);
    if (!descricao.trim()) return setErro("Descreva o programa (ex.: autor/RT, número de referência).");
    if (!vigenciaFim) return setErro("Informe a data de fim de vigência.");
    if (vigenciaInicio && vigenciaInicio > vigenciaFim) return setErro("A data de início não pode ser depois do fim.");

    setSalvando(true);
    const result = await onSave({ descricao: descricao.trim(), vigenciaInicio, vigenciaFim, precisaoFim: precisao, origem, file });
    setSalvando(false);
    if (!result.ok) return setErro(result.error);
    onClose();
  }

  const footer =
    etapa === "conferencia" ? (
      <>
        <Button variant="secondary" type="button" onClick={onClose} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleConfirmar} disabled={salvando || lendo}>
          {salvando ? "Salvando…" : "Confirmar e salvar"}
        </Button>
      </>
    ) : undefined;

  return (
    <Modal
      title={`${etapa === "upload" ? "Carregar novo documento" : "Conferir e confirmar"} — ${programa}`}
      onClose={onClose}
      width={560}
      footer={footer}
    >
      <div className={styles.body}>
        {etapa === "upload" && (
          <div className={styles.dropzone}>
            Selecione o PDF do {programa} renovado.
            <br />
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </div>
        )}

        {etapa === "conferencia" && (
          <>
            {lendo && <div className={styles.trecho}>Lendo o documento…</div>}
            {trecho && <div className={styles.trecho}>Trecho encontrado: "{trecho}"</div>}
            {motivoFalhaLeitura && <div className={styles.avisoFalha}>{motivoFalhaLeitura} — confira/preencha os campos abaixo antes de salvar.</div>}

            <LabeledField label="Descrição do programa" hint="Autor/RT, número de referência etc.">
              <textarea className={styles.textarea} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </LabeledField>

            <div className={styles.precisaoToggle}>
              <label>
                <input type="radio" checked={precisao === "dia"} onChange={() => setPrecisao("dia")} /> Sei o dia exato
              </label>
              <label>
                <input type="radio" checked={precisao === "mes"} onChange={() => setPrecisao("mes")} /> Só sei mês/ano (documento não informa o dia)
              </label>
            </div>

            <div className={styles.row2}>
              <LabeledField label="Início da vigência">
                {precisao === "dia" ? (
                  <input type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} />
                ) : (
                  <input type="month" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} />
                )}
              </LabeledField>
              <LabeledField label="Fim da vigência">
                {precisao === "dia" ? (
                  <input type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} />
                ) : (
                  <input type="month" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} />
                )}
              </LabeledField>
            </div>

            {file && <div className={styles.trecho}>Arquivo selecionado: {file.name}</div>}
            {erro && <div className={styles.error}>{erro}</div>}
          </>
        )}
      </div>
    </Modal>
  );
}
