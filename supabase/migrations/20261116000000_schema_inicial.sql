-- Bolão ACC-RE: schema inicial

create extension if not exists pgcrypto;

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- critérios de desempate da tabela do campeonato, em ordem
  standings_criteria jsonb not null
    default '["points","wins","goal_difference","goals_for","head_to_head"]'::jsonb
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text not null,
  code text not null,           -- sigla de 3 letras (escudo sem imagem)
  crest_url text,
  color text not null default '#334155',
  color2 text not null default '#FFFFFF'
);

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id),
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

create table public.edition_teams (
  edition_id uuid not null references public.editions (id) on delete cascade,
  team_id uuid not null references public.teams (id),
  tier int not null check (tier > 0),
  primary key (edition_id, team_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  round int not null check (round > 0),
  date timestamptz,
  home_team_id uuid not null references public.teams (id),
  away_team_id uuid not null references public.teams (id),
  home_goals int check (home_goals >= 0),
  away_goals int check (away_goals >= 0),
  check (home_team_id <> away_team_id),
  check ((home_goals is null) = (away_goals is null))
);
create index matches_edition_round_idx on public.matches (edition_id, round);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  user_id uuid references auth.users (id) on delete set null,
  contact text,
  created_at timestamptz not null default now()
);
create index participants_user_idx on public.participants (user_id);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  nickname text,
  -- ids dos times ordenados por nível, unidos por "|": palpites idênticos têm a mesma chave
  selection_key text not null,
  -- link pessoal (/meu/[token]); os palpites de um participante na edição compartilham o token
  access_token text not null,
  created_at timestamptz not null default now()
);
create index entries_edition_key_idx on public.entries (edition_id, selection_key);
create index entries_token_idx on public.entries (access_token);
create index entries_participant_idx on public.entries (participant_id);

create table public.entry_picks (
  entry_id uuid not null references public.entries (id) on delete cascade,
  tier int not null,
  team_id uuid not null references public.teams (id),
  primary key (entry_id, tier)
);

create table public.admins (
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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.editions enable row level security;
alter table public.edition_teams enable row level security;
alter table public.matches enable row level security;
alter table public.participants enable row level security;
alter table public.entries enable row level security;
alter table public.entry_picks enable row level security;
alter table public.admins enable row level security;

create policy "leitura publica" on public.competitions for select using (true);
create policy "leitura publica" on public.teams for select using (true);
create policy "leitura publica" on public.editions for select using (status <> 'draft' or public.is_admin());
create policy "leitura publica" on public.edition_teams for select using (true);
create policy "leitura publica" on public.matches for select using (true);

create policy "admin escreve" on public.competitions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.teams for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.editions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.edition_teams for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.matches for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.participants for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.entries for all using (public.is_admin()) with check (public.is_admin());
create policy "admin escreve" on public.entry_picks for all using (public.is_admin()) with check (public.is_admin());

create policy "ve o proprio registro" on public.admins for select using (user_id = auth.uid());
