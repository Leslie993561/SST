// Datas do portal circulam no formato brasileiro (dd/mm/aaaa) na base de dados
// e em ISO (aaaa-mm-dd) para nascimento. Estas funções isolam essa conversão.

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseBR(value: string | null | undefined): Date | null {
  if (!value || value === "—") return null;
  const parts = String(value).split("/");
  if (parts.length < 3) return null;
  const [d, m, y] = parts.map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function fmtBR(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function isoToBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length < 3) return "—";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Inverso de isoToBR — usado para pré-preencher <input type="date"> a partir de um valor dd/mm/aaaa salvo. */
export function brToIso(value: string | null | undefined): string {
  if (!value || value === "—") return "";
  const parts = value.split("/");
  if (parts.length < 3) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function mesISOfromBR(value: string | null | undefined): string {
  const d = parseBR(value);
  if (!d) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function addMonthsBR(value: string | null | undefined, n: number): string {
  const dt = parseBR(value);
  if (!dt) return "—";
  const d = new Date(dt);
  d.setMonth(d.getMonth() + n);
  return fmtBR(d);
}

/** Idade calculada a partir da data de nascimento (ISO). Nunca cadastrada manualmente. */
export function idadeFromISO(iso: string | null | undefined, hoje: Date = new Date()): number | null {
  if (!iso) return null;
  const parts = String(iso).split("-");
  if (parts.length < 3) return null;
  const [y, m, d] = parts.map(Number);
  const nascimento = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(nascimento.getTime())) return null;
  let idade = hoje.getFullYear() - nascimento.getUTCFullYear();
  const diffMes = hoje.getMonth() + 1 - (nascimento.getUTCMonth() + 1);
  if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < nascimento.getUTCDate())) idade--;
  return idade >= 0 && idade < 120 ? idade : null;
}

export function stamp(date: Date = new Date()): string {
  return `${fmtBR(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function mesAbrev(indexBase1: number): string {
  return MESES[indexBase1 - 1] ?? "";
}
