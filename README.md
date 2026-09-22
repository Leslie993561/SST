# Portal SST · MSB

Portal interno de RH/SST (Segurança e Saúde do Trabalho) da MSB — gestão de EPI e controle de Exames Ocupacionais (ASO), com base unificada de colaboradores e a matriz ocupacional (PCMSO + PGR).

Reconstruído a partir de um protótipo visual (pasta `Portal SST MSB.zip`, modelo "Moderno · Dashboard") como uma aplicação real em **React + TypeScript + Vite**, com **Supabase** como backend (autenticação + base de colaboradores) e deploy previsto na **Vercel**.

## Como rodar localmente

Pré-requisito: [Node.js](https://nodejs.org) 20+.

1. **Crie um projeto no Supabase** (gratuito) em [supabase.com](https://supabase.com/dashboard) — leva ~3 minutos.
2. **Rode o schema**: abra _SQL Editor_ no painel do projeto, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e execute. Isso cria a tabela `colaboradores` com RLS (só usuários autenticados leem).
3. **Crie a primeira conta do RH**: em _Authentication → Users → Add user_, crie uma entrada para o primeiro e-mail autorizado (ex. `carolina.cruz@msbbrasil.com`). Não é preciso senha — o login é por link mágico (magic link) enviado ao e-mail. **Não há autocadastro**: só quem tem conta criada aqui (ou pela tela **Controle de Acessos** do próprio app, ver abaixo) consegue entrar. As contas seguintes (ex. `leslie.souza@msbbrasil.com`) não precisam mais do painel do Supabase.
4. **Configure a URL de redirecionamento** do magic link em _Authentication → URL Configuration_: adicione `http://localhost:5173` (dev) e, depois do deploy, a URL da Vercel.
5. **Copie as chaves**: em _Settings → API_, pegue a `Project URL`, a `Publishable key` (antigo nome: "anon public") e a `Secret key` (antigo nome: "service_role").
6. **Configure o ambiente local**:
   ```bash
   cd portal-sst
   cp .env.example .env.local
   # edite .env.local com os 3 valores do passo 5
   npm install
   ```
7. **Carregue a base de colaboradores real** (o arquivo `src/data/colaboradores.json` com os dados reais fica só na sua máquina, nunca no git — veja "Dados e privacidade" abaixo). Com esse arquivo presente:
   ```bash
   npm run seed:supabase
   ```
8. **Rode o app**:
   ```bash
   npm run dev    # http://localhost:5173
   npm run build  # build de produção em dist/
   npm run lint   # oxlint
   ```

Sem um `.env.local` preenchido, o app sobe normalmente mas mostra a tela de login com um aviso de que o Supabase não está configurado (ver `src/lib/supabaseClient.ts`).

## Deploy na Vercel

1. Importe o repositório `Carolina87MSB/Portal-SST-MSB` na Vercel (framework detectado automaticamente: Vite).
2. Em _Settings → Environment Variables_, adicione:
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (os mesmos valores do `.env.local`). **Atenção ao prefixo**: como o projeto é Vite (não Next.js), as variáveis precisam começar com `VITE_` — `NEXT_PUBLIC_...` não é lido pelo app e o build fica com o Supabase "não configurado" mesmo depois do deploy.
   - `SUPABASE_SERVICE_ROLE_KEY` — **sem** prefixo `VITE_` (fica só no servidor, nunca chega ao navegador). Antes só era usada localmente por `npm run seed:supabase`; agora também é usada pelas Vercel Serverless Functions em `api/*.ts` (desligamento, controle de acessos e o patch de status de exame em `api/atualizar-exame.ts`) — a RLS da tabela `colaboradores` continua sem liberar UPDATE para a API pública, só essas functions, rodando no servidor, conseguem escrever.
3. Depois do primeiro deploy, volte em Supabase → _Authentication → URL Configuration_ e adicione a URL da Vercel como redirect permitido do magic link.

## Acesso

Login por **link mágico** (e-mail corporativo `@msbbrasil.com`, sem senha) via Supabase Auth — ver `src/auth/AuthContext.tsx`. Só entram e-mails com conta previamente criada (painel do Supabase ou tela **Controle de Acessos**, `shouldCreateUser: false`); não há cadastro aberto.

### Controle de Acessos (`/acessos`)

Não existe distinção de perfil neste portal — toda conta autenticada tem o mesmo acesso (`canEdit` sempre `true`, ver `src/auth/AuthContext.tsx`). Por isso a tela é simples: um formulário pra liberar um novo e-mail e uma lista de quem já tem conta. Diferente do PeopleFlow (onde a lista vem de quem é gestor/RH/diretoria na tabela `colaboradores`), aqui não há "elegibilidade" — qualquer e-mail `@msbbrasil.com` que o RH decidir pode ganhar acesso.

Funciona via duas Vercel Serverless Functions (`api/listar-acessos.ts`, `api/provisionar-acesso.ts`) que usam a `SUPABASE_SERVICE_ROLE_KEY` no servidor — essa chave nunca chega ao navegador. **Só funcionam em produção (Vercel) ou com `vercel dev`** — `npm run dev` (Vite puro) não executa `/api/*`, então localmente a tela mostra erro de carregamento; isso é esperado. A tela não tem opção de revogar acesso (só liberar) — para isso, use o painel do Supabase.

### Editar cadastro do colaborador (aba Colaboradores, dentro de EPI)

Cada linha da tabela tem um botão de editar (ícone de lápis) que abre um formulário para corrigir/completar **nome, CPF, data de nascimento, cargo e departamento**. Existe principalmente para completar o **pré-cadastro** que o Portal PeopleFlow cria automaticamente ao concluir uma movimentação de Admissão — esse fluxo não coleta CPF nem data de nascimento (são exclusivos do SST), então o colaborador aparece na lista com CPF vazio (badge "Pré-cadastro incompleto" na coluna CPF) até alguém completar por aqui.

Funciona via `api/atualizar-colaborador.ts` (mesmo padrão RH-only/service_role de `api/desligar-colaborador.ts`) — RLS não libera UPDATE direto do navegador. Não mexe em `epis`/`exames` (que têm os próprios fluxos de entrega/anexo).

### Desligamento pendente (Dashboard)

Quando uma movimentação de Desligamento é aprovada no **Portal PeopleFlow**, ela não desliga ninguém diretamente — só registra a solicitação numa tabela compartilhada (`peopleflow_desligamento_pendente`: nome, data prevista, motivo, quem aprovou). O Dashboard do SST lê essa tabela e mostra um card **"Desligamento pendente"** no topo (só para quem tem `canEdit`) sempre que houver alguma.

Clicar num item do card abre a ficha do colaborador (`ExameFichaDrawer`) já com a tela **"Desligar colaborador"** aberta e pré-preenchida com a data e o motivo vindos do PeopleFlow — o RH só revisa, decide se precisa anexar o ASO demissional (pergunta "possui mais de 90 dias?", fluxo que já existia) e confirma. Só nesse momento `colaboradores.desligado` é gravado de verdade (via `api/desligar-colaborador.ts`, como já funcionava) — e a linha em `peopleflow_desligamento_pendente` é apagada (`src/repositories/desligamentoPendenteRepository.ts`), some do card e o colaborador passa a constar em Desligados nos dois portais.

Se a leitura de `peopleflow_desligamento_pendente` falhar por qualquer motivo, o Dashboard simplesmente não mostra o card — não bloqueia o resto da página.

### ASO demissional pendente (Dashboard)

Confirmar "possui mais de 90 dias?" = Sim na tela "Desligar colaborador" **não bloqueia** o desligamento em si — ele é gravado imediatamente, e o modal de anexar exame só abre em seguida como conveniência. Fechar esse modal sem anexar nada não desfazia o desligamento nem deixava qualquer rastro, e uma vez desligado o colaborador nem tinha mais como anexar o exame depois (o botão "Anexar exame" só aparecia para quem ainda não tinha sido desligado) — um jeito fácil de o ASO demissional acabar nunca sendo anexado.

Duas mudanças resolvem isso:

- **"Anexar exame" agora fica disponível também para colaboradores já desligados** (`src/features/exames/ExameFichaDrawer.tsx`) — só "Desligar colaborador" some, já que não faz sentido desligar de novo. Dá pra acessar tanto pela aba **Desligados** ("Ver histórico") quanto pelo card abaixo.
- **`sst_aso_demissional_pendentes`** — ao confirmar "Sim" para os 90 dias, uma pendência é gravada nessa tabela (`src/repositories/asoDemissionalPendenteRepository.ts`) e vira um card **"ASO demissional pendente"** no Dashboard, do mesmo jeito que "Desligamento pendente". A pendência só é removida quando o RH efetivamente anexa um exame na ficha daquele colaborador (`ExameFichaDrawer.handleAnexar`) — não quando o modal é só fechado.

A gravação da pendência é best-effort (mesmo padrão do log de auditoria): se falhar, o desligamento em si não é afetado — o RH só não vê o lembrete no Dashboard.

### Anexos com Storage real (exames ASO e fichas de EPI assinadas)

Antes, todo anexo (exame ocupacional, ficha de EPI assinada) virava base64 e ficava só no `localStorage` do navegador — nunca saía dali, sem backup, sem visibilidade entre RH/dispositivos. As entregas e fichas de EPI em si também eram só locais (nunca existiram no Supabase). Isso mudou: agora tudo é persistido de verdade —

- **Bucket de Storage** `anexos-sst` (privado — arquivos só acessíveis via signed URL de 10 min, geradas sob demanda ao clicar em "Ver anexo"/"Ver ficha assinada"; nunca uma URL pública fixa).
- **`sst_anexos_exames`** — log de cada exame ASO anexado (`src/repositories/anexosExamesRepository.ts`). O status atual do exame (`colaboradores.exames`) continua sendo patchado via `api/atualizar-exame.ts` (service_role — RLS não libera UPDATE em `colaboradores` pela API pública).
- **`sst_entregas_epi`** / **`sst_fichas_epi`** — entregas de EPI e as fichas (PDF + via assinada) que as agrupam (`src/repositories/fichasEpiRepository.ts`).

As 3 tabelas novas têm RLS permissiva para `authenticated` (mesma regra de acesso que já existia: qualquer conta do portal é RH, não há distinção de perfil aqui) — ver os `create policy ... for all to authenticated` no fim de `supabase/schema.sql`. Rode o schema atualizado no Supabase Dashboard (idempotente, pode rodar de novo com segurança) antes de usar essas telas em produção; sem isso, os uploads falham com erro visível na tela (não silenciosamente).

### Anexar exame ocupacional: leitura automática do PDF, para qualquer tipo de ASO

No modal "Anexar exame ocupacional" (fora do fluxo com exame já travado, ex.: clicar em "Anexar" numa linha específica da ficha), o formulário funciona assim para **qualquer tipo de ASO** — Admissional, Periódico, Retorno ao trabalho, Mudança de risco/função ou Demissional:

1. **Colaborador → Tipo de ASO → Arquivo/comprovante → Exames realizados** (nessa ordem) — o campo de arquivo vem logo depois do tipo, porque a leitura do documento é o que geralmente decide quais exames marcar.
2. O seletor de exame é sempre uma lista de checkboxes com os exames mapeados na matriz ocupacional para o cargo/tipo escolhido — permite lançar vários exames de uma vez (um ASO normalmente cobre uma bateria inteira num único laudo, não só o Demissional).
3. Ao anexar um PDF, o app tenta ler o texto do documento **no próprio navegador** (via `pdfjs-dist`, carregado sob demanda só nesse fluxo — não pesa no bundle principal, `src/domain/lerDocumentoExame.ts`) e:
   - pré-marca os exames cujo nome ou código apareçam no texto;
   - pré-preenche "Data de realização" quando encontra uma data perto da palavra "data" no texto (ex.: "Data da realização: 07/07/2026"), ou quando existe exatamente uma data no documento inteiro — na dúvida (várias datas sem rótulo claro), deixa em branco em vez de arriscar a data errada.
4. O RH sempre pode revisar/ajustar as marcações e a data antes de salvar. Essa leitura só funciona com PDFs que tenham texto selecionável — digitalizações/fotos escaneadas como imagem não têm camada de texto para extrair; nesse caso o app avisa e pede preenchimento manual. Não há nenhuma chamada a serviço externo/IA — é só correspondência de texto local, sem custo.
5. **Cada exame marcado tem seu próprio campo de valor** (ao lado do checkbox, só aparece quando marcado), pré-preenchido a partir do catálogo de preços quando disponível — um ASO com exames complementares (ex.: avaliação clínica + exame de sangue) não tem o mesmo preço para os dois, então usar um valor único para todos distorceria o indicador de custo do Dashboard. "Fornecedor / clínica" continua sendo um único campo compartilhado entre todos os exames marcados (faz sentido: a mesma clínica normalmente realiza tudo na mesma visita) e **nunca é pré-preenchido** — o catálogo guarda um fornecedor "padrão" de referência, mas quem realmente atendeu pode ter sido outra clínica, então esse campo sempre começa em branco para digitação manual.
6. Só para **Demissional**: "Próxima data prevista" some do formulário (o colaborador está saindo, não há próximo exame a agendar — gravado como `"—"`, mesmo sentinela de "não se aplica" usado em outros lugares do app). Para os demais tipos, o campo continua aparecendo, calculado a partir da periodicidade do primeiro exame marcado (ajustável manualmente).

### Fardamento, preços, matriz adicionada, custos e log — também migrados do localStorage

Na mesma linha da seção acima: fardamento (entregas/reparos), os catálogos de preço (EPI/exame/fardamento), os cargos que o RH adiciona manualmente à matriz ocupacional e o log de auditoria existiam só no `localStorage` — limpar o cache do navegador apagava esses dados permanentemente, sem qualquer aviso. Agora tudo isso também é persistido no Supabase:

- **`sst_fardamento_entregas`** / **`sst_fardamento_reparos`** — histórico imutável, mesmo padrão de `sst_entregas_epi` (`src/repositories/fardamentoRepository.ts`).
- **`sst_epi_precos`** / **`sst_exame_precos`** / **`sst_fardamento_precos`** — catálogo de preços editável pelo RH, uma linha por chave de negócio (equip/código/tipo) com o histórico de cotações guardado como `jsonb` na própria linha (`src/repositories/precosRepository.ts`). O "valor de fábrica" continua vindo do catálogo estático (`portalRepository`) — ao carregar, o app mescla catálogo estático + o que já foi editado no Supabase, chave a chave, para uma chave nunca editada continuar aparecendo com o valor padrão em vez de sumir.
- **`sst_matriz_add_cargos`** — cargos adicionados manualmente à matriz ocupacional, além do catálogo estático (`src/repositories/matrizAddRepository.ts`).
- **`sst_custos_epi_mes`** / **`sst_custos_fardamento_mes`** — orçamento mensal usado no gráfico "orçado × realizado" do Dashboard. Só leitura por ora: não existe (nem existia antes, em localStorage) uma tela para o RH lançar esses valores; as tabelas já ficam prontas para quando essa tela for construída.
- **`sst_log`** — log de auditoria (append-only: a policy de RLS só libera `insert`/`select`, sem `update`/`delete`, reforçando no banco a garantia que antes só existia por convenção no reducer). Toda ação do RH que gera uma linha de log (entrega/edição/exclusão de EPI, anexo de exame, desligamento, edição de cadastro, preço editado, cargo adicionado, ficha gerada/assinada) grava direto nessa tabela via `src/repositories/logRepository.ts`, além de atualizar o estado local na hora (`ADICIONAR_LOG_ENTRY`) para feedback imediato na tela.

Rode o schema atualizado no Supabase Dashboard antes de usar essas telas em produção (mesmo aviso da seção anterior — idempotente, seguro rodar de novo).

### Marcador de gênero neutro "(a)" nos nomes de cargo

Vários cargos de liderança passaram a usar "(a)" no nome (ex.: "Diretor (a) Industrial", "Supervisor (a) de Operações de Vendas"). `normalizeCargo()` (`src/domain/text.ts`), usada pela matriz ocupacional (`cargoOcupacionalPara()`) e pela matriz de EPI (`matrizEpiParaColaborador()`) em `src/domain/matriz.ts` para casar `colaboradores.cargo` com o catálogo, agora remove "(a)" em qualquer posição do texto antes de comparar — sem isso, um cargo cadastrado na matriz como "Supervisor de Operações de Vendas" pararia de bater assim que o colaborador passasse a ter "Supervisor (a) de Operações de Vendas" gravado.

## Arquitetura

```
api/                        Vercel Serverless Functions (Node, só servidor — nunca no bundle do navegador)
  _lib/adminAuth.ts           confere sessão Supabase Auth válida; client admin com a service_role key
  desligar-colaborador.ts      POST — grava desligado/data_desligamento/motivo_desligamento na tabela
                              colaboradores (RLS não libera UPDATE público, só esta function)
  listar-acessos.ts             GET — lista e-mails com conta no Supabase Auth
  provisionar-acesso.ts         POST — cria conta no Supabase Auth para um e-mail @msbbrasil.com
src/
  types/domain.ts          entidades de domínio (Colaborador, ExameRegistro, MatrizOcupacional, ...)
  lib/supabaseClient.ts    cliente Supabase único, lido de variáveis de ambiente
  repositories/
    colaboradoresRepository.ts   busca colaboradores no Supabase (único dado pessoal/sensível) e
                                 chama api/desligar-colaborador.ts para persistir desligamentos
    acessosRepository.ts          chama as Serverless Functions em api/*.ts (nunca fala com o
                                 Supabase Auth admin direto do navegador)
    portalRepository.ts          catálogos e matrizes estáticos, sem dado pessoal (JSON no bundle)
  domain/                  regras de negócio puras (status de exame, datas, textos/máscaras, matriz
                           função → EPI/exames) — testáveis isoladamente, sem React
  store/                   estado via useReducer + Context; carrega tudo do Supabase ao logar
                           (colaboradores, entregas/fichas/anexos, fardamento, preços, matriz
                           adicionada, custos, log) e limpa tudo (memória + localStorage) ao
                           deslogar — localStorage é só um cache de leitura rápida entre
                           carregamentos, nunca a fonte da verdade
  auth/                    Supabase Auth (magic link) + guarda de rotas
  components/ui/           design system (Card, KpiCard, StatusBadge, Table, Modal, Drawer, ...)
  components/layout/       casca do app (Sidebar, Header, AppShell)
  components/shared/       componentes reaproveitados entre módulos (ex.: PriceEditModal)
  features/
    auth/                  tela de login (link mágico)
    dashboard/              KPIs, conformidade, custos EPI/fardamento, previsto × realizado
    epi/                    Gestão de EPI (colaboradores, matriz, histórico, custos, fardamento)
    exames/                 Exames Ocupacionais (controle, vencimentos, pendências, matriz
                            ocupacional PCMSO+PGR, histórico, desligados)
    relatorios/             exportações (.csv) e indicadores
    config/                 departamentos, catálogo de EPI, integrações previstas
    acessos/                 tela de Controle de Acessos (liberar/listar contas)
scripts/seed-supabase.mjs  carrega src/data/colaboradores.json (local) na tabela do Supabase
supabase/schema.sql        schema + RLS da tabela colaboradores
```

Princípios seguidos:

- **Inversão de dependência de dados**: nenhuma tela busca dados diretamente — tudo passa por um repositório (`colaboradoresRepository` ou `portalRepository`), então trocar a fonte de novo é uma mudança isolada num arquivo.
- **Lógica de negócio fora do React**: cálculo de status de exame (`Em dia/A vencer/Vencido/Necessita revisão`), idade, máscaras de CPF, matching de cargo→matriz etc. vivem em `src/domain/*.ts` como funções puras, sem hooks — fáceis de testar unitariamente.
- **Status sempre recalculado, nunca lido como valor congelado**: o campo `status` importado da planilha original é ignorado; tudo é recomputado a partir da data de hoje, então o portal continua correto conforme o tempo passa.
- **Exame com idade mínima (ex.: ECG só a partir de 40 anos) nunca conta como "Pendente" antes da idade**: `statusDoRegistro()`/`statusGeralFor()` (`src/domain/exameStatus.ts`) recebem opcionalmente a idade do colaborador + o catálogo, e retornam "Em dia" (em vez de "Pendente") para um exame nunca realizado cuja idade mínima do PCMSO (`pcmsoIdadeMinFor()`, extraída do texto livre de `obs`, ex. "a partir de 40 anos") ainda não foi atingida. Antes, todo exame nunca feito virava "Pendente" incondicionalmente, mesmo quando o colaborador ainda nem tinha idade para precisar dele — todas as telas que exibem/contam status (ficha do colaborador, Controle de ASO, Dashboard, Relatórios) passam esse contexto.
- **Estado editável separado da base de origem**: entregas de EPI/fardamento, anexos de exame, preços, cargos adicionados e desligamentos vivem em `PortalStoreContext` (reducer com ações tipadas), persistidos no Supabase, e nunca sobrescrevem os dados de origem — mesmo padrão do protótipo original ("nunca substitui, sempre adiciona").

## Dados e privacidade (LGPD)

A base de colaboradores contém **dados reais**: nome completo, CPF, data de nascimento e histórico de exames de saúde. Como **este repositório é público**, esse dado nunca é commitado:

- `src/data/colaboradores.json` está no `.gitignore` — existe só localmente, em quem gerou a base original.
- `src/data/colaboradores.example.json` (versionado) mostra o formato esperado com dados fictícios.
- Em produção, os dados reais moram só no Postgres do Supabase, atrás de RLS (`supabase/schema.sql`): apenas usuários autenticados via Supabase Auth conseguem ler a tabela `colaboradores` — sem login, a API do Supabase não devolve nenhuma linha.
- `npm run seed:supabase` é o único jeito de popular a tabela do zero; usa a `service_role` key, que **nunca** deve ir para a Vercel nem para o bundle do navegador (só existe no `.env.local`, fora do git).
- Para **atualizar** cargo/departamento/nascimento a partir de uma planilha de RH mais nova (ex.: exportações "Colaboradores x Cargos x Departamentos"), use `scripts/gen-upsert-sql.mjs` (requer `npm install --no-save xlsx`) — ele mescla a planilha com `src/data/colaboradores.json` (casando por CPF ou, na falta dele, por nome) e gera um único SQL de `INSERT ... ON CONFLICT (id) DO UPDATE` em `supabase/local/*.sql` (pasta gitignored, nunca commitada). É **idempotente**: pode rodar no SQL Editor do Supabase independentemente da tabela já ter dados ou estar vazia — quem já existe é atualizado, quem não existe é criado, ninguém é apagado. Revise o SQL gerado antes de rodar.
- Ao deslogar, `PortalStoreContext` limpa colaboradores da memória e do `localStorage` do navegador.

Próximos incrementos de segurança sugeridos (fora do escopo atual):

1. Tabela `profiles` associando usuário Supabase → papel (`rh` / `leitura`), hoje todo usuário autenticado é tratado como RH.
2. Tela de lançamento para `sst_custos_epi_mes` / `sst_custos_fardamento_mes` (orçamento mensal usado no gráfico "orçado × realizado" do Dashboard) — as tabelas já existem no Supabase e são lidas, mas ainda não há UI para o RH editar esses valores; hoje ficam vazias.

## Funcionalidades não implementadas (fora de escopo desta etapa)

- Importação de planilha Excel pelo navegador (havia um protótipo disso no design original) — ver aba **Configurações**, que documenta isso como item de roadmap.
- Integração **Academia MSB** — presente na navegação como "prevista", sem automação. **PeopleFlow** já tem uma integração real: os dois portais compartilham o mesmo projeto Supabase e a mesma tabela `colaboradores`; ao desligar alguém aqui, ele aparece automaticamente na aba Desligados do PeopleFlow (ver `api/desligar-colaborador.ts` e o README do PeopleFlow).
- Exportação de relatórios em PDF (apenas CSV foi implementado em **Relatórios**).
- Distinção real de papel "somente leitura" (hoje todo login autenticado tem permissão de RH — ver item 1 acima).
