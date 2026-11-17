-- Edições antigas importadas da planilha: em vez de jogos e regras, guardam o
-- resultado final pronto (pontos de cada time por etapa, com o detalhamento,
-- e a posição final de cada palpite, quando informada).
alter table bolao.editions add column imported_results jsonb;

-- Sobra do link de edição por palpite, que deixou de existir.
drop index if exists bolao.entries_token_idx;
alter table bolao.entries drop column if exists access_token;
