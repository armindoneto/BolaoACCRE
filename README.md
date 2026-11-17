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
- Depois de enviado, **só o administrador** altera ou exclui um palpite.
- A página **Participantes** lista quem tem palpite na edição em vigor, com os nomes dos palpites; o **perfil** mostra os palpites atuais, o histórico e os troféus: ouro (1º), prata (2º), bronze (3º) e vermelho (último), um por palpite premiado em cada turno encerrado.

## Como o código está organizado

- `src/lib/scoring/`: motor de cálculo, puro e testado. Os tipos de regra ficam em `rules/`; as regras de cada edição vêm do JSON em `editions.rules`.
- `src/lib/data/`: acesso aos dados. `supabase.ts` (produção) e `memory.ts` (modo demonstração) implementam a mesma interface.
- `src/app/`: páginas públicas, `/palpite`, `/meu/[token]` e `/admin`.
- `supabase/`: migration do schema e seed da edição 2026.

## Ciclo de uma edição

Em `/admin` → **Edições**, cada edição tem um botão para o próximo passo:

1. **Rascunho**: não aparece no site.
2. **Palpites abertos**: a página inicial vira o convite para palpitar (os times de cada palpite ficam escondidos).
3. **Em andamento**: palpites travados; a classificação é a página inicial.
4. **Encerrada**: sai da página inicial e vai para o Histórico, que mostra a classificação final de cada turno e os pontos de cada time.

Para um novo bolão, use **Nova edição a partir de uma anterior** e ajuste regras e níveis.

## Importar bolões antigos

Em `/admin` → **Edições** → **Importar bolão antigo**. Copie as células da planilha e cole (o Excel separa as colunas por tabulação; ponto e vírgula também funciona). O botão **Conferir dados** aponta os problemas e mostra um resumo antes de gravar.

**1. Níveis e times**, uma linha por nível:

```
1: Flamengo, Palmeiras
2: Cruzeiro, Mirassol
```

**2. Pontos de cada time**, como uma lista de lançamentos. Escreva o nome da etapa numa linha, depois o nome do time e, embaixo, os lançamentos dele: pontos, descrição e, se quiser, um complemento (a rodada).

```
1º turno
Flamengo
3,0	Vitória	1ª Rodada
0,5	Vitória fora de casa	1ª Rodada
Palmeiras
1,0	Empate	1ª Rodada
2º turno
Flamengo
1,0	Empate	21ª Rodada
3,0	Vitória	22ª Rodada
```

- A descrição aparece no site **exatamente como estiver escrita**. Nenhuma regra é aplicada nem precisa ser cadastrada: cada bolão antigo pode ter os seus próprios tipos de ponto.
- O total do time na etapa é a soma dos lançamentos.
- A linha com o nome da etapa vale para todos os times que vêm depois dela. Com uma etapa só, ela é dispensável.
- O time pode ser escrito pelo nome, nome curto ou sigla.
- Um time sem nenhum lançamento numa etapa fica com zero, e o resumo avisa.

**3. Palpites**, uma linha por palpite:

| palpite | participante | N1 | N2 | … | N10 | pos 1 | pts 1 | pos 2 | pts 2 |
|---|---|---|---|---|---|---|---|---|---|
| João 1 | João Silva | Flamengo | Cruzeiro | … | Remo | 1 | 312,5 | 7 | 280 |

- Os times vão na ordem dos níveis.
- `pos N` (posição final na etapa N) é opcional. Sem ela, a posição sai do total de pontos, com desempate pelo time do nível 1, depois nível 2, e assim por diante.
- `pts N` é opcional e serve só para conferência: o site avisa se não bater com a soma dos times do palpite.
- Participantes que ainda não existem são cadastrados automaticamente; os que já existem são reconhecidos pelo nome.
- São premiados o 1º, o 2º, o 3º e o último de cada etapa.

Para corrigir uma edição importada, exclua-a (em Editar) e importe de novo.
