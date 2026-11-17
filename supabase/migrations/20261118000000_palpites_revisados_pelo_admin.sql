-- Novo fluxo: só o administrador cadastra participantes. Quem palpita pelo site
-- escolhe os times e dá um nome ao palpite; o administrador revisa o nome e
-- atribui o palpite a um participante.

-- 1. O palpite pode existir sem participante (aguardando revisão).
alter table bolao.entries alter column participant_id drop not null;
alter table bolao.entries drop constraint entries_participant_id_fkey;
alter table bolao.entries
  add constraint entries_participant_id_fkey
  foreign key (participant_id) references bolao.participants (id) on delete set null;

-- 2. Todo palpite tem nome próprio (antes era um apelido opcional).
alter table bolao.entries rename column nickname to name;

with numbered as (
  select
    e.id,
    p.display_name,
    row_number() over (partition by e.edition_id, e.participant_id order by e.created_at, e.id) as n,
    count(*) over (partition by e.edition_id, e.participant_id) as total
  from bolao.entries e
  join bolao.participants p on p.id = e.participant_id
)
update bolao.entries e
set name = case when numbered.total > 1 then numbered.display_name || ' ' || numbered.n else numbered.display_name end
from numbered
where numbered.id = e.id and (e.name is null or btrim(e.name) = '');

update bolao.entries set name = 'Palpite' where name is null or btrim(name) = '';
alter table bolao.entries alter column name set not null;

-- 3. O link de edição volta a ser de cada palpite (o participante não tem mais link nem conta).
alter table bolao.entries add column access_token text;
update bolao.entries set access_token = replace(gen_random_uuid()::text, '-', '');
alter table bolao.entries
  alter column access_token set not null,
  alter column access_token set default replace(gen_random_uuid()::text, '-', '');
create unique index entries_token_idx on bolao.entries (access_token);

drop index if exists bolao.participants_token_idx;
alter table bolao.participants drop column access_token;
