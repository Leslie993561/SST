// Gera um único SQL de upsert (INSERT ... ON CONFLICT (id) DO UPDATE) com TODOS
// os colaboradores conhecidos: a base local (src/data/colaboradores.json, com
// epis/exames reais) mesclada com cargo/departamento/nascimento mais recentes
// de uma planilha de RH — e roda igual não importa se a tabela no Supabase já
// tem esses registros ou está vazia (idempotente).
//
// Uso (a lib xlsx não é dependência do projeto — só deste utilitário):
//   npm install --no-save xlsx
//   node scripts/gen-upsert-sql.mjs "C:/caminho/para/planilha.xlsx"

import xlsx from "xlsx";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename } from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: node scripts/gen-upsert-sql.mjs <planilha.xlsx>");
  process.exit(1);
}

function normCpf(v) {
  const d = String(v || "").replace(/\D/g, "");
  return d ? d.padStart(11, "0") : "";
}
function normName(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}
function parseSheetDate(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(String(s ?? "").trim());
  if (!m) return null;
  const [, mo, da, yy] = m;
  const year = Number(yy) <= 29 ? 2000 + Number(yy) : 1900 + Number(yy);
  return `${year}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
}
function sqlStr(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlJson(v) {
  return `'${JSON.stringify(v ?? []).replace(/'/g, "''")}'::jsonb`;
}

const wb = xlsx.readFile(inputPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });
const dataRows = rows.slice(2).filter((r) => r && r.length && r[0] && String(r[0]).trim());

const existing = JSON.parse(readFileSync("src/data/colaboradores.json", "utf-8"));
const existingByCpf = new Map(existing.filter((c) => normCpf(c.cpf)).map((c) => [normCpf(c.cpf), c]));
const existingByName = new Map(existing.map((c) => [normName(c.nome), c]));
let maxId = Math.max(...existing.map((c) => c.id));

// Começa com todos os colaboradores conhecidos hoje (preserva epis/exames reais).
const merged = new Map(existing.map((c) => [c.id, { ...c }]));

for (const r of dataRows) {
  const [nomeRaw, cpfRaw, nascRaw, cargoRaw, deptoRaw] = r;
  const cpf = normCpf(cpfRaw);
  const nome = String(nomeRaw).trim();
  const ex = (cpf && existingByCpf.get(cpf)) || existingByName.get(normName(nome));

  const cargo = String(cargoRaw || "").trim();
  const departamento = String(deptoRaw || "").trim();
  const nascimento = parseSheetDate(nascRaw);

  if (ex) {
    const atual = merged.get(ex.id);
    merged.set(ex.id, { ...atual, nome, cpf: cpf || atual.cpf, cargo, departamento, nascimento: nascimento || atual.nascimento });
  } else {
    maxId += 1;
    merged.set(maxId, {
      id: maxId,
      cpf,
      nome,
      cargo,
      departamento,
      epis: [],
      exames: [],
      origem: "Cargos x Departamentos",
      nascimento,
    });
  }
}

// cargo/departamento/origem/nome/cpf são NOT NULL na tabela (ver supabase/schema.sql)
// — alguns cadastros antigos têm esses campos como null (ex.: Carolaine/Ourivania
// sem departamento); normaliza para string vazia em vez de deixar virar SQL NULL.
const registros = [...merged.values()]
  .map((c) => ({
    ...c,
    cpf: c.cpf ?? "",
    nome: c.nome ?? "",
    cargo: c.cargo ?? "",
    departamento: c.departamento ?? "",
    origem: c.origem ?? "",
  }))
  .sort((a, b) => a.id - b.id);

const lines = [];
lines.push(`-- Upsert completo gerado a partir de '${basename(inputPath)}' + src/data/colaboradores.json.`);
lines.push("-- Contém CPF, nome e histórico de saúde reais — NÃO COMMITAR.");
lines.push("-- Idempotente: pode rodar quantas vezes precisar, tabela vazia ou não.");
lines.push("");
lines.push("begin;");
lines.push("");
for (const c of registros) {
  lines.push(
    `insert into public.colaboradores (id, cpf, nome, cargo, departamento, epis, exames, origem, nascimento) values ` +
      `(${c.id}, ${sqlStr(c.cpf)}, ${sqlStr(c.nome)}, ${sqlStr(c.cargo)}, ${sqlStr(c.departamento)}, ${sqlJson(c.epis)}, ${sqlJson(c.exames)}, ${sqlStr(c.origem)}, ${c.nascimento ? sqlStr(c.nascimento) : "NULL"}) ` +
      `on conflict (id) do update set nome = excluded.nome, cpf = excluded.cpf, cargo = excluded.cargo, departamento = excluded.departamento, epis = excluded.epis, exames = excluded.exames, origem = excluded.origem, nascimento = excluded.nascimento, updated_at = now();`,
  );
}
lines.push("");
lines.push("commit;");

mkdirSync("supabase/local", { recursive: true });
const outPath = "supabase/local/upsert-colaboradores.sql";
writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");

console.log(`Gerado: ${outPath}`);
console.log({ total: registros.length });
