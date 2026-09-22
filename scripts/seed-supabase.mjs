// Envia a base local de colaboradores (com dado real e sensível) para a
// tabela `colaboradores` no Supabase. Roda só em Node, nunca no navegador —
// usa a service_role key, que ignora RLS.
//
// Uso:
//   node --env-file=.env.local scripts/seed-supabase.mjs
//   node --env-file=.env.local scripts/seed-supabase.mjs caminho/para/outro-arquivo.json
//
// Pré-requisitos em .env.local (ver .env.example):
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Faltam variáveis de ambiente. Rode com `node --env-file=.env.local scripts/seed-supabase.mjs`\n" +
      "e preencha VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local (veja .env.example).",
  );
  process.exit(1);
}

const defaultPath = fileURLToPath(new URL("../src/data/colaboradores.json", import.meta.url));
const jsonPath = process.argv[2] ?? defaultPath;

let colaboradores;
try {
  colaboradores = JSON.parse(readFileSync(jsonPath, "utf-8"));
} catch (err) {
  console.error(`Não consegui ler ${jsonPath}: ${err.message}`);
  console.error("Esse arquivo é local (gitignored) — precisa existir na sua máquina antes de rodar este script.");
  process.exit(1);
}

if (!Array.isArray(colaboradores) || colaboradores.length === 0) {
  console.error(`${jsonPath} não contém uma lista de colaboradores válida.`);
  process.exit(1);
}

const rows = colaboradores.map((c) => ({
  id: c.id,
  cpf: String(c.cpf ?? ""),
  nome: c.nome ?? "",
  cargo: c.cargo ?? "",
  departamento: c.departamento ?? "",
  epis: c.epis ?? [],
  exames: c.exames ?? [],
  origem: c.origem ?? "",
  nascimento: c.nascimento || null,
}));

const supabase = createClient(url, serviceRoleKey);

console.log(`Enviando ${rows.length} colaborador(es) de ${jsonPath} para ${url}...`);
const { error, count } = await supabase.from("colaboradores").upsert(rows, { onConflict: "id", count: "exact" });

if (error) {
  console.error("Falha ao gravar no Supabase:", error.message);
  process.exit(1);
}

console.log(`OK — ${count ?? rows.length} linha(s) gravada(s)/atualizada(s) na tabela colaboradores.`);
