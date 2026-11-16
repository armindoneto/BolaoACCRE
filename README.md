# Bolão ACC-RE

Site do bolão de times do Campeonato Brasileiro. As regras do bolão e as decisões de projeto estão em [`CLAUDE.md`](CLAUDE.md).

## Rodar no seu computador

```bash
pnpm install
```

```bash
pnpm dev
```

Abra http://localhost:3000. Sem configurar o Supabase, o site abre em **modo demonstração**: dados fictícios em memória, área do admin aberta em `/admin`, e nada fica salvo.

Outros comandos: `pnpm test` (testes do motor de cálculo), `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Colocar no ar (Supabase + Vercel)

1. Crie um projeto em https://supabase.com.
2. No **SQL Editor** do Supabase, rode o conteúdo de `supabase/migrations/20261116000000_schema_inicial.sql` e depois o de `supabase/seed.sql` (cria os times, os níveis e as regras do Brasileirão 2026).
3. Copie `.env.example` para `.env.local` e preencha com as chaves do projeto (Supabase → Project Settings → API). Configure as mesmas variáveis na Vercel.
4. Em Supabase → Authentication → URL Configuration, informe o endereço do site e adicione `https://SEU-SITE/auth/callback` em *Redirect URLs*. O login por link no e-mail já funciona; o login com Google precisa ser ativado em Authentication → Providers.
5. Entre no site em `/entrar` com o seu e-mail e depois rode no SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'SEU_EMAIL_AQUI';
   ```
6. Em `/admin`: importe a tabela de jogos (aba **Jogos**), cadastre os palpites (aba **Palpites**) e lance os resultados (aba **Resultados**).

## Como o código está organizado

- `src/lib/scoring/`: motor de cálculo, puro e testado. Os tipos de regra ficam em `rules/`; as regras de cada edição vêm do JSON em `editions.rules`.
- `src/lib/data/`: acesso aos dados. `supabase.ts` (produção) e `memory.ts` (modo demonstração) implementam a mesma interface.
- `src/app/`: páginas públicas, `/palpite`, `/meu/[token]` e `/admin`.
- `supabase/`: migration do schema e seed da edição 2026.

## Ciclo de uma edição

`Rascunho` → `Palpites abertos` (formulário liberado; os times de cada palpite ficam escondidos) → `Em andamento` (palpites travados, classificação pública) → `Encerrada` (vai para o Histórico). Para um novo bolão, use **Edições → Nova edição a partir de uma anterior** e ajuste regras e níveis.
