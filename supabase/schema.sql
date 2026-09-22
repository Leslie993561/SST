-- Portal SST MSB — schema da tabela de colaboradores no Supabase.
--
-- Rode este arquivo inteiro em Supabase Dashboard > SQL Editor > New query.
-- Ele é seguro para rodar mais de uma vez (usa IF NOT EXISTS / OR REPLACE).
--
-- Por que só "colaboradores" está aqui: é a única tabela que guarda dado
-- pessoal sensível (CPF, nome, exames de saúde) do repositório público. As
-- demais listas (catálogo de EPI, matriz por função, matriz ocupacional)
-- continuam como JSON estático em src/data/ — não têm dado de colaborador e
-- não precisam de controle de acesso.

create table if not exists public.colaboradores (
  id bigint primary key,
  cpf text not null,
  nome text not null,
  cargo text not null default '',
  departamento text not null default '',
  epis jsonb not null default '[]'::jsonb,
  exames jsonb not null default '[]'::jsonb,
  origem text not null default '',
  nascimento date,
  updated_at timestamptz not null default now()
);

comment on table public.colaboradores is
  'Base unificada EPI + ASO. Dado pessoal sensível (LGPD) — acesso restrito por RLS a usuários autenticados.';
comment on column public.colaboradores.epis is 'Lista de nomes de EPI (string[]).';
comment on column public.colaboradores.exames is 'Lista de { proc, ultimo, proximo, status } — ver ExameRegistro em src/types/domain.ts.';

-- Row Level Security: só usuários autenticados no Supabase Auth conseguem
-- LER a tabela. Ninguém (nem autenticado) pode INSERT/UPDATE/DELETE pela API
-- pública — a carga de dados é feita só pelo script de seed com a service
-- role key (que ignora RLS), rodado localmente pela equipe de RH/dados.
alter table public.colaboradores enable row level security;

drop policy if exists "authenticated_can_read_colaboradores" on public.colaboradores;
create policy "authenticated_can_read_colaboradores"
  on public.colaboradores
  for select
  to authenticated
  using (true);

-- Desligamento — campos usados também pelo Portal PeopleFlow (mesmo projeto
-- Supabase, mesma tabela `colaboradores`). Colunas novas, todas opcionais;
-- não afetam nenhuma leitura/policy existente.
--
-- Diferente do resto da tabela (carregada só pelo script de seed local com a
-- service_role key), o desligamento é gravado a partir do próprio app: a ação
-- "Desligar colaborador" chama a Vercel Serverless Function em
-- api/desligar-colaborador.ts, que usa a service_role key no servidor — a
-- policy de RLS abaixo continua sem permitir UPDATE via API pública.
alter table public.colaboradores
  add column if not exists desligado boolean not null default false,
  add column if not exists data_desligamento date,
  add column if not exists motivo_desligamento text,
  add column if not exists desligado_by text;

comment on column public.colaboradores.desligado is 'true quando o colaborador foi desligado (ver api/desligar-colaborador.ts).';
comment on column public.colaboradores.data_desligamento is 'Data do desligamento.';
comment on column public.colaboradores.motivo_desligamento is 'Motivo informado no momento do desligamento.';
comment on column public.colaboradores.desligado_by is 'E-mail do usuário RH que registrou o desligamento.';

-- Anexos de exame ocupacional (ASO) e fichas de entrega de EPI — Storage real
-- no Supabase. Antes, o arquivo virava base64 e ficava só no localStorage do
-- navegador (nunca saía dali, sem backup, sem visibilidade entre RH/dispositivos)
-- — ver AnexarExameModal.tsx e FichaEpiControls.tsx. As entregas/fichas de EPI
-- em si também eram só locais (nunca existiram no Supabase); passam a ser a
-- fonte da verdade aqui, com os arquivos anexados no bucket abaixo.

-- 1) Bucket de Storage — privado (leitura só via signed URL, nunca pública).
insert into storage.buckets (id, name, public)
values ('anexos-sst', 'anexos-sst', false)
on conflict (id) do nothing;

drop policy if exists "authenticated_upload_anexos_sst" on storage.objects;
create policy "authenticated_upload_anexos_sst"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos-sst');

drop policy if exists "authenticated_read_anexos_sst" on storage.objects;
create policy "authenticated_read_anexos_sst"
  on storage.objects for select to authenticated
  using (bucket_id = 'anexos-sst');

-- 2) Anexos de exame ocupacional — log histórico de cada exame anexado
-- (equivalente ao antigo state.attachments, agora persistido).
create table if not exists public.sst_anexos_exames (
  id text primary key,
  colab_id bigint not null references public.colaboradores(id),
  proc text not null,
  data_iso text not null default '',
  fornecedor text not null default '',
  valor numeric not null default 0,
  file_name text not null default '',
  storage_path text,
  ts text not null default '',
  responsavel text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sst_anexos_exames is
  'Log de exames ASO anexados (documento no bucket anexos-sst) — ver AttachmentExame em src/types/domain.ts.';

alter table public.sst_anexos_exames enable row level security;
drop policy if exists "authenticated_full_access_anexos_exames" on public.sst_anexos_exames;
create policy "authenticated_full_access_anexos_exames"
  on public.sst_anexos_exames for all
  to authenticated
  using (true)
  with check (true);

-- 3) Entregas de EPI — uma linha por item entregue, nunca sobrescrita
-- (mesma regra de "histórico imutável" que já existia local).
create table if not exists public.sst_entregas_epi (
  id text primary key,
  colab_id bigint not null references public.colaboradores(id),
  cpf text not null default '',
  epi text not null,
  qtd integer not null default 1,
  ca text not null default '',
  fornecedor text not null default '',
  valor_unit numeric not null default 0,
  data_entrega text not null default '',
  data_troca text not null default '',
  obs text not null default '',
  responsavel text not null default '',
  assinatura text not null default '',
  ficha_id text,
  ts text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sst_entregas_epi is
  'Entregas de EPI registradas pelo RH — ver EntregaEpi em src/types/domain.ts.';

alter table public.sst_entregas_epi enable row level security;
drop policy if exists "authenticated_full_access_entregas_epi" on public.sst_entregas_epi;
create policy "authenticated_full_access_entregas_epi"
  on public.sst_entregas_epi for all
  to authenticated
  using (true)
  with check (true);

-- 4) Fichas de entrega de EPI (PDF) — agrupam entregas num lote assinável,
-- com a via assinada anexada depois pelo RH.
create table if not exists public.sst_fichas_epi (
  id text primary key,
  numero integer not null,
  colab_id bigint not null references public.colaboradores(id),
  entrega_ids text[] not null default '{}',
  gerada_em text not null default '',
  gerada_por text not null default '',
  assinatura_file_name text,
  assinatura_mime text,
  assinatura_storage_path text,
  assinatura_anexada_em text,
  assinatura_responsavel text,
  created_at timestamptz not null default now()
);

comment on table public.sst_fichas_epi is
  'Fichas de entrega de EPI e a via assinada anexada — ver FichaEntregaEpi em src/types/domain.ts.';

alter table public.sst_fichas_epi enable row level security;
drop policy if exists "authenticated_full_access_fichas_epi" on public.sst_fichas_epi;
create policy "authenticated_full_access_fichas_epi"
  on public.sst_fichas_epi for all
  to authenticated
  using (true)
  with check (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Fardamento, tabelas de preço, cargos adicionados à matriz, orçamentos
-- mensais e o log de auditoria — até aqui só existiam em localStorage
-- (nunca sincronizados com o Supabase), então limpar o cache do navegador
-- apagava esses dados permanentemente. Mesmo padrão das seções acima.

-- 5) Entregas de fardamento — histórico imutável, um registro por entrega
-- (equivalente de sst_entregas_epi, sem o conceito de ficha/assinatura).
create table if not exists public.sst_fardamento_entregas (
  id text primary key,
  colab_id bigint not null references public.colaboradores(id),
  cpf text not null default '',
  tipo text not null default '',
  qtd integer not null default 1,
  tamanho text not null default '',
  valor_unit numeric not null default 0,
  fornecedor text not null default '',
  data_entrega text not null default '',
  data_compra text not null default '',
  obs text not null default '',
  responsavel text not null default '',
  ts text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sst_fardamento_entregas is
  'Entregas de fardamento (uniformes) registradas pelo RH — ver FardamentoEntrega em src/types/domain.ts.';

alter table public.sst_fardamento_entregas enable row level security;
drop policy if exists "authenticated_full_access_fardamento_entregas" on public.sst_fardamento_entregas;
create policy "authenticated_full_access_fardamento_entregas"
  on public.sst_fardamento_entregas for all
  to authenticated
  using (true)
  with check (true);

-- 6) Reparos de fardamento — histórico imutável, mesmo padrão das entregas.
create table if not exists public.sst_fardamento_reparos (
  id text primary key,
  colab_id bigint not null references public.colaboradores(id),
  cpf text not null default '',
  peca text not null default '',
  tipo_reparo text not null default '',
  valor numeric not null default 0,
  fornecedor text not null default '',
  data_reparo text not null default '',
  obs text not null default '',
  responsavel text not null default '',
  ts text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sst_fardamento_reparos is
  'Reparos de fardamento registrados pelo RH — ver FardamentoReparo em src/types/domain.ts.';

alter table public.sst_fardamento_reparos enable row level security;
drop policy if exists "authenticated_full_access_fardamento_reparos" on public.sst_fardamento_reparos;
create policy "authenticated_full_access_fardamento_reparos"
  on public.sst_fardamento_reparos for all
  to authenticated
  using (true)
  with check (true);

-- 7/8/9) Tabelas de preço (EPI, exame, fardamento) — catálogo editável pelo
-- RH, uma linha por chave de negócio (equip/codigo/tipo), com o histórico de
-- alterações guardado como jsonb na própria linha (mesmo padrão de
-- colaboradores.epis/exames — lista aninhada, não precisa de tabela própria
-- já que só é lida/escrita inteira, nunca uma entrada do histórico isolada).
create table if not exists public.sst_epi_precos (
  equip text primary key,
  valor numeric not null default 0,
  fornecedor text not null default '',
  data_cotacao text not null default '',
  historico jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.sst_epi_precos is
  'Catálogo de preços de EPI, editável pelo RH — ver PrecoInfo em src/types/domain.ts.';

alter table public.sst_epi_precos enable row level security;
drop policy if exists "authenticated_full_access_epi_precos" on public.sst_epi_precos;
create policy "authenticated_full_access_epi_precos"
  on public.sst_epi_precos for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.sst_exame_precos (
  codigo text primary key,
  valor numeric not null default 0,
  fornecedor text not null default '',
  data_cotacao text not null default '',
  historico jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.sst_exame_precos is
  'Catálogo de preços de exame ocupacional, editável pelo RH — ver PrecoInfo em src/types/domain.ts.';

alter table public.sst_exame_precos enable row level security;
drop policy if exists "authenticated_full_access_exame_precos" on public.sst_exame_precos;
create policy "authenticated_full_access_exame_precos"
  on public.sst_exame_precos for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.sst_fardamento_precos (
  tipo text primary key,
  valor numeric not null default 0,
  fornecedor text not null default '',
  data_cotacao text not null default '',
  historico jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.sst_fardamento_precos is
  'Catálogo de preços de fardamento, editável pelo RH — ver PrecoInfo em src/types/domain.ts.';

alter table public.sst_fardamento_precos enable row level security;
drop policy if exists "authenticated_full_access_fardamento_precos" on public.sst_fardamento_precos;
create policy "authenticated_full_access_fardamento_precos"
  on public.sst_fardamento_precos for all
  to authenticated
  using (true)
  with check (true);

-- 10) Cargos adicionados manualmente à matriz ocupacional (além do catálogo
-- estático) — riscos/epis/exames de cada cargo ficam em jsonb, mesmo padrão
-- de colaboradores.epis/exames.
create table if not exists public.sst_matriz_add_cargos (
  id text primary key,
  nome text not null default '',
  cbo text not null default '',
  ambiente text not null default '',
  riscos jsonb not null default '[]'::jsonb,
  epis jsonb not null default '[]'::jsonb,
  exames jsonb not null default '[]'::jsonb,
  added_by text not null default '',
  ts text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sst_matriz_add_cargos is
  'Cargos adicionados pelo RH à matriz ocupacional, além do catálogo estático — ver CargoOcupacional em src/types/domain.ts.';

alter table public.sst_matriz_add_cargos enable row level security;
drop policy if exists "authenticated_full_access_matriz_add_cargos" on public.sst_matriz_add_cargos;
create policy "authenticated_full_access_matriz_add_cargos"
  on public.sst_matriz_add_cargos for all
  to authenticated
  using (true)
  with check (true);

-- 11/12) Orçamento mensal de EPI/fardamento (base para o gráfico "orçado x
-- realizado" do Dashboard) — hoje não existe tela para o RH preencher isso
-- (o campo já ficava sempre vazio em localStorage também), mas a tabela já
-- fica pronta para quando essa tela for construída.
create table if not exists public.sst_custos_epi_mes (
  mes text primary key,
  orcado numeric not null default 0,
  realizado_base numeric not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.sst_custos_epi_mes is
  'Orçamento mensal de EPI (base para o gráfico orçado x realizado) — ver CustoMesEpi em src/store/types.ts.';

alter table public.sst_custos_epi_mes enable row level security;
drop policy if exists "authenticated_full_access_custos_epi_mes" on public.sst_custos_epi_mes;
create policy "authenticated_full_access_custos_epi_mes"
  on public.sst_custos_epi_mes for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.sst_custos_fardamento_mes (
  mes text primary key,
  orcado numeric not null default 0,
  entrega_base numeric not null default 0,
  reparo_base numeric not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.sst_custos_fardamento_mes is
  'Orçamento mensal de fardamento (base para o gráfico orçado x realizado) — ver CustoMesFardamento em src/store/types.ts.';

alter table public.sst_custos_fardamento_mes enable row level security;
drop policy if exists "authenticated_full_access_custos_fardamento_mes" on public.sst_custos_fardamento_mes;
create policy "authenticated_full_access_custos_fardamento_mes"
  on public.sst_custos_fardamento_mes for all
  to authenticated
  using (true)
  with check (true);

-- 13) Log de auditoria — histórico de ações do RH no portal. Policy
-- deliberadamente sem update/delete (só insert + select): reforça no banco
-- a garantia de "append-only" que antes só existia por convenção no reducer.
create table if not exists public.sst_log (
  id text primary key,
  action text not null default '',
  colab_id bigint references public.colaboradores(id),
  colab_nome text not null default '',
  detail text not null default '',
  user_email text not null default '',
  ts text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sst_log is
  'Log de auditoria (append-only) das ações do RH no portal — ver LogEntry em src/types/domain.ts.';

alter table public.sst_log enable row level security;

drop policy if exists "authenticated_insert_log" on public.sst_log;
create policy "authenticated_insert_log"
  on public.sst_log for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated_read_log" on public.sst_log;
create policy "authenticated_read_log"
  on public.sst_log for select
  to authenticated
  using (true);

-- 14) Pendência de ASO demissional — criada aqui mesmo no SST (ao contrário de
-- peopleflow_desligamento_pendente, que vem do outro portal) quando o RH
-- confirma "possui mais de 90 dias?" = Sim na tela "Desligar colaborador".
-- Só some quando o exame demissional é de fato anexado na ficha do
-- colaborador — antes disso, o RH só via um modal de sugestão fácil de
-- fechar sem deixar rastro nenhum.
create table if not exists public.sst_aso_demissional_pendentes (
  id text primary key,
  colab_id bigint not null references public.colaboradores(id),
  desligado_em text not null default '',
  motivo text not null default '',
  solicitado_por text not null default '',
  ts text not null default '',
  created_at timestamptz not null default now(),
  unique (colab_id)
);

alter table public.sst_aso_demissional_pendentes enable row level security;
drop policy if exists "authenticated_full_access_aso_demissional_pendentes" on public.sst_aso_demissional_pendentes;
create policy "authenticated_full_access_aso_demissional_pendentes"
  on public.sst_aso_demissional_pendentes for all
  to authenticated
  using (true)
  with check (true);

-- Programas de Saúde Ocupacional (PCMSO/PGR) — histórico de versões. Cada
-- renovação/atualização gera uma linha nova (nunca sobrescreve a anterior);
-- o status de vencimento usa sempre a versão mais recente de cada `programa`.
-- Ver ProgramaSaude em src/types/domain.ts.
create table if not exists public.sst_programas_saude (
  id text primary key,
  programa text not null,
  descricao text not null default '',
  vigencia_inicio text not null default '',
  vigencia_fim text not null default '',
  precisao_fim text not null default 'dia',
  confirmado boolean not null default false,
  confirmado_por text not null default '',
  confirmado_em text not null default '',
  origem text not null default '',
  file_name text not null default '',
  storage_path text,
  registrado_por text not null default '',
  ts text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sst_programas_saude is
  'Histórico de versões dos Programas de Saúde Ocupacional (PCMSO/PGR) — cada linha é uma versão/renovação, nunca sobrescrita.';

alter table public.sst_programas_saude enable row level security;
drop policy if exists "authenticated_full_access_programas_saude" on public.sst_programas_saude;
create policy "authenticated_full_access_programas_saude"
  on public.sst_programas_saude for all
  to authenticated
  using (true)
  with check (true);
