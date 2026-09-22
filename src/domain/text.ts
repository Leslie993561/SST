// Formatação de texto — puro, sem dependências de UI ou de estado.

export function titleCase(value: string | null | undefined): string {
  if (!value) return "";
  return value.toLowerCase().replace(/(^|\s|\/|-)([a-zà-ÿ])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

export function iniciais(nome: string | null | undefined): string {
  const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes[partes.length - 1]?.[0] ?? "";
  return (primeira + ultima).toUpperCase();
}

/** Normaliza nomes de cargo/função para comparação (remove acentos, sufixos de senioridade,
 * marcador de gênero neutro "(a)" em qualquer posição — ex.: "Diretor (a) Industrial" bate
 * com "Diretor Industrial" na matriz ocupacional/EPI). */
export function normalizeCargo(value: string | null | undefined): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/\s*\(A\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*(I{1,3}|JR|JÚNIOR|SR|SÊNIOR|PLENO)\s*$/, "")
    .trim();
}

export function fmtCpfFull(cpf: string | null | undefined): string {
  const digits = String(cpf ?? "").replace(/\D/g, "").padStart(11, "0");
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskCpf(cpf: string | null | undefined, revelar = false): string {
  if (!cpf) return "—";
  if (revelar) return fmtCpfFull(cpf);
  const digits = String(cpf).replace(/\D/g, "").padStart(11, "0");
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.***-**`;
}

export function fmtMoney(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function deptName(value: string | null | undefined): string {
  return value || "Sem classificação";
}
