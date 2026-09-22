// Camada de acesso a dados para colaboradores — a única entidade com dado
// pessoal sensível (CPF, nome, exames de saúde). Ao contrário dos catálogos
// estáticos em portalRepository.ts, esta busca é assíncrona e vem do Supabase
// (tabela `colaboradores`, protegida por RLS — só usuários autenticados leem).
//
// Trocar a fonte de novo no futuro (outro backend) é uma mudança isolada
// neste arquivo; nada mais no app importa o Supabase diretamente para dados
// de colaborador.

import { isoToBR } from "../domain/dates";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { Colaborador } from "../types/domain";

interface ColaboradorRow {
  id: number;
  cpf: string;
  nome: string;
  cargo: string | null;
  departamento: string | null;
  epis: string[] | null;
  exames: Colaborador["exames"] | null;
  origem: string | null;
  nascimento: string | null;
  desligado: boolean | null;
  data_desligamento: string | null;
  motivo_desligamento: string | null;
  desligado_by: string | null;
}

function fromRow(row: ColaboradorRow): Colaborador {
  return {
    id: row.id,
    cpf: row.cpf,
    nome: row.nome,
    cargo: row.cargo ?? "",
    departamento: row.departamento ?? "",
    epis: row.epis ?? [],
    exames: row.exames ?? [],
    origem: row.origem ?? "",
    nascimento: row.nascimento ?? "",
    desligado: row.desligado ?? false,
    dataDesligamento: isoToBR(row.data_desligamento),
    motivoDesligamento: row.motivo_desligamento ?? "",
    desligadoBy: row.desligado_by ?? "",
  };
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local " +
        "(veja .env.example) para carregar a base de colaboradores.",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export type DesligarResult = { ok: true } | { ok: false; error: string };

export interface DadosColaboradorEditavel {
  cpf: string;
  nome: string;
  cargo: string;
  departamento: string;
  nascimento: string; // aaaa-mm-dd, ou "" para limpar
}

export interface ColaboradoresRepository {
  getColaboradores(): Promise<Colaborador[]>;
  /** Persiste o desligamento no Supabase via api/desligar-colaborador.ts (service_role, RLS não libera UPDATE público). */
  desligarColaborador(colabId: number, dataIso: string, motivo: string): Promise<DesligarResult>;
  /** Completa/corrige o cadastro (cpf, nome, cargo, departamento, nascimento) via api/atualizar-colaborador.ts. */
  atualizarColaborador(colabId: number, dados: DadosColaboradorEditavel): Promise<DesligarResult>;
}

class SupabaseColaboradoresRepository implements ColaboradoresRepository {
  async getColaboradores(): Promise<Colaborador[]> {
    if (!supabaseConfigured) throw new SupabaseNotConfiguredError();

    const { data, error } = await supabase.from("colaboradores").select("*").order("nome", { ascending: true });

    if (error) {
      throw new Error(`Falha ao carregar colaboradores do Supabase: ${error.message}`);
    }
    return (data as ColaboradorRow[]).map(fromRow);
  }

  async desligarColaborador(colabId: number, dataIso: string, motivo: string): Promise<DesligarResult> {
    if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { ok: false, error: "Sessão expirada — faça login novamente." };

    const res = await fetch("/api/desligar-colaborador", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ colabId, dataIso, motivo }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || "Falha ao registrar desligamento." };
    return { ok: true };
  }

  async atualizarColaborador(colabId: number, dados: DadosColaboradorEditavel): Promise<DesligarResult> {
    if (!supabaseConfigured) return { ok: false, error: "Supabase não configurado nesta instalação." };

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { ok: false, error: "Sessão expirada — faça login novamente." };

    const res = await fetch("/api/atualizar-colaborador", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ colabId, ...dados }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || "Falha ao atualizar cadastro." };
    return { ok: true };
  }
}

export const colaboradoresRepository: ColaboradoresRepository = new SupabaseColaboradoresRepository();
