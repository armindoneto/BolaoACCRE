-- O link pessoal (/meu/[token]) passa a ser do PARTICIPANTE, não de cada palpite.
-- Assim a pessoa tem um único link, que continua valendo nas próximas edições,
-- e o seu histórico fica reunido num só cadastro.

alter table bolao.participants add column access_token text;

-- Quem já tinha palpites herda o link que já estava usando.
update bolao.participants p
set access_token = (
  select min(e.access_token) from bolao.entries e where e.participant_id = p.id
);

update bolao.participants
set access_token = replace(gen_random_uuid()::text, '-', '')
where access_token is null;

alter table bolao.participants
  alter column access_token set not null,
  alter column access_token set default replace(gen_random_uuid()::text, '-', '');

create unique index participants_token_idx on bolao.participants (access_token);

drop index if exists bolao.entries_token_idx;
alter table bolao.entries drop column access_token;
