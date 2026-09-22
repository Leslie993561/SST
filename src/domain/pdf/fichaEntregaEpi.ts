import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Colaborador, EntregaEpi } from "../../types/domain";
import { deptName, fmtCpfFull, fmtMoney, titleCase } from "../text";
import { codigoFichaEpi } from "../fichaAssinatura";

const DECLARACAO =
  "Declaro que recebi os Equipamentos de Proteção Individual relacionados acima, em perfeitas condições de uso, " +
  "comprometendo-me a utilizá-los corretamente, conforme orientações recebidas, responsabilizando-me por sua guarda, " +
  "conservação e devolução quando aplicável.";

interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

export interface FichaEntregaEpiInfo {
  id: string;
  numero: number;
  geradaEm: string;
  geradaPor: string;
}

/** Nome de arquivo sugerido para a ficha, sem acentos/espaços. */
export function nomeArquivoFichaEntregaEpi(ficha: FichaEntregaEpiInfo, colaborador: Colaborador): string {
  const nome = titleCase(colaborador.nome)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
  const data = ficha.geradaEm.split(" ")[0]?.replace(/\//g, "-") ?? "data";
  return `${codigoFichaEpi(ficha.numero)}_${nome}_${data}.pdf`;
}

/** Gera (em memória) a Ficha de Entrega de EPI em PDF, com uma linha por EPI do lote. */
export function gerarFichaEntregaEpiPdf(entregas: EntregaEpi[], colaborador: Colaborador, ficha: FichaEntregaEpiInfo): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as JsPdfWithAutoTable;
  const marginLeft = 48;
  const marginRight = 547;
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  // "·" (meio-ponto) não renderiza nas fontes padrão do jsPDF (vira um retângulo) — usa "-".
  doc.text("MSB - Medical System do Brasil", marginLeft, y);
  y += 20;
  doc.setFontSize(11.5);
  doc.text("Ficha de Entrega de Equipamento de Proteção Individual (EPI)", marginLeft, y);
  y += 16;

  doc.setDrawColor(180);
  doc.line(marginLeft, y, marginRight, y);
  y += 26;

  function bloco(titulo: string, campos: Array<[string, string]>, labelWidth: number) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(86, 164, 187);
    doc.text(titulo, marginLeft, y);
    doc.setTextColor(20, 20, 20);
    y += 16;
    doc.setFontSize(10);
    campos.forEach(([label, valor]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, marginLeft, y);
      doc.setFont("helvetica", "normal");
      doc.text(valor || "—", marginLeft + labelWidth, y);
      y += 15;
    });
    y += 10;
  }

  bloco(
    "DADOS DO COLABORADOR",
    [
      ["Nome", titleCase(colaborador.nome)],
      ["CPF", fmtCpfFull(colaborador.cpf)],
      ["Cargo", colaborador.cargo ? titleCase(colaborador.cargo) : "—"],
      ["Departamento", deptName(colaborador.departamento)],
    ],
    110,
  );

  bloco(
    "DADOS DA ENTREGA",
    [
      ["Ficha nº", codigoFichaEpi(ficha.numero)],
      ["Gerada em", ficha.geradaEm],
      ["Responsável pelo registro", ficha.geradaPor],
    ],
    150,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(86, 164, 187);
  doc.text("RELAÇÃO DOS EPIs ENTREGUES", marginLeft, y);
  doc.setTextColor(20, 20, 20);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: marginLeft, right: 595 - marginRight },
    head: [["Data", "EPI", "Qtd", "CA", "Vencimento/troca", "Valor unit.", "Fornecedor"]],
    body: entregas.map((entrega) => [
      entrega.dataEntrega,
      entrega.epi,
      String(entrega.qtd),
      entrega.ca || "—",
      entrega.dataTroca || "—",
      entrega.valorUnit ? fmtMoney(entrega.valorUnit) : "—",
      entrega.fornecedor || "—",
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6, textColor: [20, 20, 20] },
    headStyles: { fillColor: [86, 164, 187], textColor: [255, 255, 255], fontStyle: "bold" },
  });

  y = (doc.lastAutoTable?.finalY ?? y + 60) + 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(86, 164, 187);
  doc.text("DECLARAÇÃO", marginLeft, y);
  doc.setTextColor(20, 20, 20);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const declaracaoLinhas = doc.splitTextToSize(DECLARACAO, marginRight - marginLeft);
  doc.text(declaracaoLinhas, marginLeft, y);
  y += declaracaoLinhas.length * 13 + 34;

  function assinatura(rotulo: string, nome: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(86, 164, 187);
    doc.text(rotulo, marginLeft, y);
    doc.setTextColor(20, 20, 20);
    y += 26;
    doc.setDrawColor(120);
    doc.line(marginLeft, y, marginLeft + 260, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Nome: ${nome || "—"}`, marginLeft, y + 14);
    doc.text("Assinatura: ______________________________", marginLeft, y + 30);
    doc.text("Data: ____ / ____ / ________", marginLeft + 300, y + 30);
    y += 54;
  }

  assinatura("ASSINATURA DO COLABORADOR", titleCase(colaborador.nome));
  assinatura("ASSINATURA DO RESPONSÁVEL PELA ENTREGA", ficha.geradaPor);

  return doc;
}

/** Gera e dispara o download da ficha no navegador. */
export function baixarFichaEntregaEpiPdf(entregas: EntregaEpi[], colaborador: Colaborador, ficha: FichaEntregaEpiInfo): void {
  const doc = gerarFichaEntregaEpiPdf(entregas, colaborador, ficha);
  doc.save(nomeArquivoFichaEntregaEpi(ficha, colaborador));
}
