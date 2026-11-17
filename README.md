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

O bolão usa um schema próprio do Postgres, chamado `bolao`. Assim ele pode dividir um projeto Supabase com outro sistema (o plano gratuito só permite 2 projetos) sem misturar tabelas.

1. Escolha o projeto Supabase que vai hospedar o bolão (pode ser um que já existe).
2. No **SQL Editor**, rode, em ordem de data, o conteúdo de cada arquivo de `supabase/migrations/` e depois o de `supabase/seed.sql` (cria os times, os níveis e as regras do Brasileirão 2026). Nada fora do schema `bolao` é alterado.
3. Em **Project Settings → Data API → Exposed schemas**, adicione `bolao` e salve. Sem isso o site não enxerga as tabelas.
4. Copie `.env.example` para `.env.local` e preencha com as chaves do projeto (Project Settings → API). Configure as mesmas variáveis na Vercel.
5. Em **Authentication → URL Configuration**, adicione `https://SEU-SITE/auth/callback` em *Redirect URLs* (não precisa trocar o *Site URL* do outro sistema). O login (só do administrador) é por link enviado ao e-mail.
6. Entre no site em `/entrar` com o seu e-mail e depois rode no SQL Editor:
   ```sql
   insert into bolao.admins (user_id)
   select id from auth.users where email = 'SEU_EMAIL_AQUI';
   ```
7. Em `/admin`: importe a tabela de jogos (aba **Jogos**), cadastre os palpites (aba **Palpites**) e lance os resultados (aba **Resultados**). Os escudos são enviados na aba **Times**; as imagens ficam no Supabase Storage, num depósito público chamado `bolao-escudos`, criado sozinho no primeiro envio.

Em projeto compartilhado, as contas de login e o modelo do e-mail de acesso são os mesmos do outro sistema. Quem é administrador do bolão é definido só pela tabela `bolao.admins`.

## Atualizar um banco que já existe

Quando uma atualização do site trouxer um arquivo novo em `supabase/migrations/`, rode o conteúdo dele no SQL Editor **antes** de publicar a nova versão. Cada arquivo roda uma única vez.

## Participantes, palpites e troféus

- **Só o administrador cadastra participantes**, em `/admin` → **Participantes**. Basta o nome. Os participantes não têm conta.
- **Quem palpita pelo site** só dá um nome ao palpite e escolhe os times. O palpite chega sem participante.
- **Revisão**: em `/admin` → **Palpites**, os palpites sem participante aparecem primeiro. Ali você ajusta o nome e escolhe a quem pertence.
- Ao enviar, a pessoa recebe um **link de edição** daquele palpite (`/meu/...`), para mudar os times até o prazo. O admin também consegue copiar esse link.
- A página **Participantes** lista quem tem palpite na edição em vigor, com os nomes dos palpites; o **perfil** mostra os palpites atuais, o histórico e os troféus: ouro (1º), prata (2º), bronze (3º) e vermelho (último), um por palpite premiado em cada turno encerrado.

## Como o código está organizado

- `src/lib/scoring/`: motor de cálculo, puro e testado. Os tipos de regra ficam em `rules/`; as regras de cada edição vêm do JSON em `editions.rules`.
- `src/lib/data/`: acesso aos dados. `supabase.ts` (produção) e `memory.ts` (modo demonstração) implementam a mesma interface.
- `src/app/`: páginas públicas, `/palpite`, `/meu/[token]` e `/admin`.
- `supabase/`: migration do schema e seed da edição 2026.

## Ciclo de uma edição

`Rascunho` → `Palpites abertos` (formulário liberado; os times de cada palpite ficam escondidos) → `Em andamento` (palpites travados, classificação pública) → `Encerrada` (vai para o Histórico). Para um novo bolão, use **Edições → Nova edição a partir de uma anterior** e ajuste regras e níveis.
