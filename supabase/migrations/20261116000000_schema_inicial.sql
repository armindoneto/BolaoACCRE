-- Bolão ACC-RE: schema inicial
--
-- Tudo fica no schema "bolao", separado do schema "public", para o bolão poder
-- dividir um projeto Supabase com outro sistema sem misturar tabelas.
-- Depois de rodar, exponha o schema na API:
--   Project Settings > Data API > Exposed schemas > adicionar "bolao".

create schema if not exists bolao;

create table bolao.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- critérios de desempate da tabela do campeonato, em ordem
  standings_criteria jsonb not null
    default '["points","wins","goal_difference","goals_for","head_to_head"]'::jsonb
);

create table bolao.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text not null,
  code text not null,           -- sigla de 3 letras (escudo sem imagem)
  crest_url text,
  color text not null default '#334155',
  color2 text not null default '#FFFFFF'
);

create table bolao.editions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references bolao.competitions (id),
  season int not null,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'open_for_entries', 'running', 'finished')),
  rules jsonb not null,
  entries_deadline timestamptz,
  prizes_text text,
  -- turno -> lista de ids de times, para desempates manuais da tabela
  manual_standings_order jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table bolao.edition_teams (
  edition_id uuid not null references bolao.editions (id) on delete cascade,
  team_id uuid not null references bolao.teams (id),
  tier int not null check (tier > 0),
  primary key (edition_id, team_id)
);

create table bolao.matches (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references bolao.editions (id) on delete cascade,
  round int not null check (round > 0),
  date timestamptz,
  home_team_id uuid not null references bolao.teams (id),
  away_team_id uuid not null references bolao.teams (id),
  home_goals int check (home_goals >= 0),
  away_goals int check (away_goals >= 0),
  check (home_team_id <> away_team_id),
  check ((home_goals is null) = (away_goals is null))
);
create index matches_edition_round_idx on bolao.matches (edition_id, round);

create table bolao.participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  user_id uuid references auth.users (id) on delete set null,
  contact text,
  created_at timestamptz not null default now()
);
create index participants_user_idx on bolao.participants (user_id);

create table bolao.entries (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references bolao.editions (id) on delete cascade,
  participant_id uuid not null references bolao.participants (id) on delete cascade,
  nickname text,
  -- ids dos times ordenados por nível, unidos por "|": palpites idênticos têm a mesma chave
  selection_key text not null,
  -- link pessoal (/meu/[token]); os palpites de um participante na edição compartilham o token
  access_token text not null,
  created_at timestamptz not null default now()
);
create index entries_edition_key_idx on bolao.entries (edition_id, selection_key);
create index entries_token_idx on bolao.entries (access_token);
create index entries_participant_idx on bolao.entries (participant_id);

create table bolao.entry_picks (
  entry_id uuid not null references bolao.entries (id) on delete cascade,
  tier int not null,
  team_id uuid not null references bolao.teams (id),
  primary key (entry_id, tier)
);

create table bolao.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Leitura pública: dados do campeonato e da edição.
-- Participantes e palpites NÃO têm leitura pública direta (guardam contato e o
-- token do link pessoal): o site lê e grava pelo servidor, com a chave de
-- serviço, depois de conferir admin / token / prazo.
-- Escrita direta: só administradores.
-- ---------------------------------------------------------------------------

create or replace function bolao.is_admin()
returns boolean
language sql
stable
security definer
set search_path = bolao
as $$
  select exists (select 1 from bolao.admins where user_id = auth.uid());
$$;

alter table bolao.competitions enable row level security;
alter table bolao.teams enable row level security;
alter table bolao.editions enable row level security;
alter table bolao.edition_teams enable row level security;
alter table bolao.matches enable row level security;
alter table bolao.participants enable row level security;
alter table bolao.entries enable row level security;
alter table bolao.entry_picks enable row level security;
alter table bolao.admins enable row level security;

create policy "leitura publica" on bolao.competitions for select using (true);
create policy "leitura publica" on bolao.teams for select using (true);
create policy "leitura publica" on bolao.editions for select using (status <> 'draft' or bolao.is_admin());
create policy "leitura publica" on bolao.edition_teams for select using (true);
create policy "leitura publica" on bolao.matches for select using (true);

create policy "admin escreve" on bolao.competitions for all using (bolao.is_admin()) with check (bolao.is_admin());
create policy "admin escreve" on bolao.teams for all using (bolao.is_admin()) with check (bolao.is_admin());
create policy "admin escreve" on bolao.editions for all using (bolao.is_admin()) with check (bolao.is_admin());
create policy "admin escreve" on bolao.edition_teams for all using (bolao.is_admin()) with check (bolao.is_admin());
create policy "admin escreve" on bolao.matches for all using (bolao.is_admin()) with check (bolao.is_admin());
create policy "admin escreve" on bolao.participants for all using (bolao.is_admin()) with check (bolao.is_admin());
create policy "admin escreve" on bolao.entries for all using (bolao.is_admin()) with check (bolao.is_admin());
create policy "admin escreve" on bolao.entry_picks for all using (bolao.is_admin()) with check (bolao.is_admin());

create policy "ve o proprio registro" on bolao.admins for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Permissões do schema (um schema novo não vem liberado para a API).
-- O RLS acima continua decidindo quais linhas cada papel enxerga ou altera.
-- ---------------------------------------------------------------------------

grant usage on schema bolao to anon, authenticated, service_role;
grant all on all tables in schema bolao to service_role;
grant select on all tables in schema bolao to anon;
grant select, insert, update, delete on all tables in schema bolao to authenticated;
grant execute on function bolao.is_admin() to anon, authenticated, service_role;
