// Camada de acesso à tabela `sst_matriz_add_cargos` (Supabase) — cargos que o
// RH adiciona manualmente à matriz ocupacional, além do catálogo estático.
// Antes existiam só em localStorage.

import { stamp } from "../domain/dates";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { CargoOcupacional } from "../types/domain";
import { uid } from "../store/seed";

interface MatrizAddCargoRow {
  id: string;
  nome: string;
  cbo: string;
  ambiente: string;
  riscos: CargoOcupacional["riscos"];
  epis: CargoOcupacional["epis"];
  exames: CargoOcupacional["exames"];
  added_by: string;
  ts: string;
}

function cargoFromRow(row: MatrizAddCargoRow): CargoOcupacional {
  return {
    nome: row.nome,
    cbo: row.cbo,
    ambiente: row.ambiente,
    riscos: row.riscos ?? [],
    epis: row.epis ?? [],
    exames: row.exames ?? [],
    _addedBy: row.added_by,
    _ts: row.ts,
  };
}

export async function getMatrizAddCargos(): Promise<CargoOcupacional[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("sst_matriz_add_cargos").select("*").order("ts", { ascending: true });
  if (error) throw new Error(`Falha ao carregar cargos adicionados à matriz: ${error.message}`);
  return (data as MatrizAddCargoRow[]).map(cargoFromRow);
}

export type AdicionarCargoMatrizResult = { ok: true; cargo: CargoOcupacional } | { ok: false; error: string };

export async function adicionarCargoMatriz(cargo: CargoOcupacional, addedBy: string): Promise<AdicionarCargoMatrizResult> {
  if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };
  const id = uid("MC");
  const ts = stamp();
  const { error } = await supabase.from("sst_matriz_add_cargos").insert({
    id,
    nome: cargo.nome,
    cbo: cargo.cbo,
    ambiente: cargo.ambiente,
    riscos: cargo.riscos,
    epis: cargo.epis,
    exames: cargo.exames,
    added_by: addedBy,
    ts,
  });
  if (error) return { ok: false, error: `Falha ao adicionar cargo à matriz: ${error.message}` };
  return { ok: true, cargo: { ...cargo, _addedBy: addedBy, _ts: ts } };
}
