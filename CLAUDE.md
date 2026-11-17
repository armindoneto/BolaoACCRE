# Bolão ACC-RE

Site do **Bolão ACC-RE**, o bolão de times do Campeonato Brasileiro (e eventualmente de outros campeonatos), mantido por um único administrador e acompanhado por dezenas de participantes, muitos com pouca familiaridade digital.

Ele substitui a planilha Excel e o PDF usados hoje. Prioridades, nesta ordem: **cálculos corretos**, **simplicidade para o participante**, **visual limpo e bom no celular**.

Idioma da interface: português (pt-BR). Os números usam vírgula decimal (ex.: 12,5 pts).

---

## Como o bolão funciona

- Cada **edição** (bolão) está ligada a um campeonato e a uma temporada. Exemplo: Brasileirão 2026.
- Os times da edição são divididos em **níveis**. No formato atual são 10 níveis, com 2 times em cada um.
- Um **palpite** é a escolha de 1 time por nível, com um nome próprio. Ele não muda até o fim do campeonato.
- Um **participante** é uma pessoa cadastrada pelo administrador (só o nome). Um participante pode ter **mais de um palpite** (ex.: "Fulano 1", "Fulano 2").
- A pontuação de um palpite é a **soma das pontuações dos times escolhidos**.
- A edição tem **duas etapas independentes, cada uma com premiação própria**: 1º turno (rodadas 1–19) e 2º turno (rodadas 20–38). Os palpites são os mesmos nas duas.
- **Ao fim do 1º turno, tudo zera**: a classificação do bolão *e* a tabela do campeonato usada nas regras. O 2º turno é calculado só com os jogos das rodadas 20–38, como se fosse um campeonato novo.
- Um **jogo adiado conta para o turno da sua rodada original**, mesmo se for disputado depois. Enquanto houver jogo pendente, o resultado final daquele turno (bônus de fim de turno e premiação) fica **pendente** até o jogo acontecer. A interface mostra isso claramente.
- **As regras de pontuação e de desempate mudam a cada edição.** Por isso nada de regra pode ficar fixo no código. Tudo vem da configuração da edição (veja abaixo).

### Regras da edição atual (Brasileirão 2026)

Níveis:

| Nível | Opção A | Opção B |
|---|---|---|
| 1 | Flamengo | Palmeiras |
| 2 | Cruzeiro | Mirassol |
| 3 | Fluminense | Botafogo |
| 4 | Bahia | São Paulo |
| 5 | Grêmio | Red Bull Bragantino |
| 6 | Atlético Mineiro | Santos |
| 7 | Corinthians | Vasco da Gama |
| 8 | Vitória | Internacional |
| 9 | Coritiba | Athletico-PR |
| 10 | Chapecoense | Remo |

Pontuação base de cada time:
- Vitória: +3
- Empate: +1

Pontos extras (são cumulativos):
- a) Campeão do turno: +3
- b) Vice-campeão do turno: +1
- c) Vitória por goleada (3 ou mais gols de diferença): +2
- d) Vitória fora de casa (pelo mando da tabela oficial): +0,5
- e) Vitória de time dos níveis 9 ou 10 sobre time dos níveis 1 ou 2: +1
- f) Derrota por goleada (3 ou mais gols de diferença): −2
- g) Time dos níveis 9 ou 10 entre os 4 primeiros no fim do turno: +2
- h) Time entre os 4 "rebaixados" no fim do turno: −3

Desempate entre palpites:
1. Maior total de pontos.
2. Maior pontuação do time do nível 1. Se continuar empatado, do nível 2, e assim por diante até o nível 10.
3. Se ainda houver empate (inclusive palpites idênticos), os palpites **dividem a posição** e o prêmio.

Premiação (em cada turno):
- São premiados o **1º, o 2º, o 3º e o último colocado**.
- Empatados numa posição premiada **dividem aquele prêmio**, e o próximo grupo abaixo **leva o prêmio seguinte**. Ou seja, as posições são contadas por grupo de empatados (ranking denso). Exemplo: A tem 80, B, C e D têm 75, E tem 70. A é o 1º. B, C e D dividem o prêmio de 2º. E fica com o prêmio de 3º.
- A classificação mostra as posições do mesmo jeito: 1º, 2º, 2º, 2º, 3º...
- O último colocado também pode ser um grupo empatado, que divide o prêmio.
- Os premiados aparecem **em destaque** (medalhas ou cores para 1º, 2º e 3º, e um selo próprio para o último). Ao fim de cada turno, mostre um bloco de "Vencedores do turno" no topo da classificação.

**Observação importante:** nesta edição, *todo* ponto (base e extras) pertence a um time. Por isso o total do palpite é sempre a soma das pontuações dos seus times, e o desempate por nível funciona direto. Mantenha essa arquitetura: calcule por time e depois some por palpite.

### Decisões já confirmadas pelo administrador

- As regras a, b, g e h usam a **tabela só dos jogos do turno**, nunca a acumulada.
- O turno de um jogo é definido pela **rodada**, não pela data.
- A premiação é **por turno**. Não existe classificação geral premiada. Se uma visão "Geral" (soma dos dois turnos) for exibida, é só informativa e fica em segundo plano.

---

## Stack

- **Next.js** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase**: Postgres, Auth e Row Level Security
- **Vitest** para os testes do motor de cálculo
- Deploy na **Vercel**, código no **GitHub**
- Gerenciador de pacotes: pnpm

---

## Arquitetura de regras (o ponto central)

As regras ficam num JSON salvo em `editions.rules`. O código tem um **catálogo de tipos de regra** em `src/lib/scoring/rules/`. Cada tipo é uma função pura e parametrizável. Uma edição nova combina tipos do catálogo com parâmetros próprios. Só é preciso escrever código quando surgir um *tipo* de regra realmente novo.

Exemplo da configuração da edição atual:

```json
{
  "periods": [
    { "id": "T1", "name": "1º turno", "rounds": [1, 19] },
    { "id": "T2", "name": "2º turno", "rounds": [20, 38] }
  ],
  "matchRules": [
    { "type": "win", "points": 3 },
    { "type": "draw", "points": 1 },
    { "type": "win_by_margin", "minMargin": 3, "points": 2 },
    { "type": "away_win", "points": 0.5 },
    { "type": "win_vs_tiers", "teamTiers": [9, 10], "opponentTiers": [1, 2], "points": 1 },
    { "type": "loss_by_margin", "minMargin": 3, "points": -2 }
  ],
  "periodEndRules": [
    { "type": "standing_position", "positions": [1], "points": 3, "label": "Campeão do turno" },
    { "type": "standing_position", "positions": [2], "points": 1, "label": "Vice do turno" },
    { "type": "standing_position", "positions": [1, 2, 3, 4], "teamTiers": [9, 10], "points": 2, "label": "Nível 9/10 no G4" },
    { "type": "standing_position", "positions": "last4", "points": -3, "label": "Rebaixado no turno" }
  ],
  "tiebreakers": [
    { "type": "total_points" },
    { "type": "tier_points_sequence", "tiers": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
  ],
  "fullTieBehavior": "share_position",
  "prizes": {
    "scope": "per_period",
    "positions": [1, 2, 3, "last"],
    "ranking": "dense",
    "tieBehavior": "split"
  }
}
```

Requisitos do motor:
- Fica em `src/lib/scoring/` e é **puro**: não acessa banco nem rede. Recebe a edição, as regras, os jogos e os palpites, e devolve as pontuações.
- Cada ponto gera um **lançamento detalhado** (time, jogo ou fim de turno, regra, pontos). Assim a página de times pode mostrar "de onde veio cada ponto".
- As regras de fim de turno e a premiação só valem quando **todos** os jogos das rodadas do turno tiverem resultado, inclusive os adiados. Antes disso o turno fica com status `pendente`. A interface mostra "Aguardando jogo adiado: X × Y" e pode exibir uma projeção, marcada como "parcial".
- O motor calcula cada turno de forma **isolada**: classificação do bolão e tabela do campeonato começam do zero na rodada 20.
- Use números decimais (0,5). Nos cálculos, trabalhe em **décimos inteiros** para evitar erro de ponto flutuante e formate só na exibição.
- A tabela do campeonato segue os critérios da CBF: pontos, vitórias, saldo de gols, gols pró, confronto direto, cartões vermelhos, cartões amarelos e sorteio. Os critérios ficam configuráveis por campeonato. Implemente pelo menos até gols pró e confronto direto, e permita que o admin defina a ordem manualmente nos casos restantes.
- **Testes obrigatórios** para cada tipo de regra e para os desempates, incluindo: um empate total que divide a posição, o exemplo de premiação acima (três empatados em 2º e o próximo levando o 3º), um empate no último lugar, e um turno pendente por jogo adiado.

O recálculo é feito **sempre que o admin salva um resultado**. Recalcular a edição inteira é barato, então não vale otimizar. Os resultados podem ficar gravados em tabelas de cache (`team_scores`, `entry_scores`) ou ser calculados na hora. Comece pelo mais simples.

---

## Modelo de dados (Supabase)

- `competitions`: id, nome (ex.: "Brasileirão Série A"), critérios de desempate da tabela
- `teams`: id, nome, nome curto, sigla, cores, escudo (url; as imagens ficam no Supabase Storage)
- `editions`: id, competition_id, temporada, nome, status (`draft` | `open_for_entries` | `running` | `finished`), `rules` (jsonb), prazo de palpites, prêmios (texto livre)
- `edition_teams`: edition_id, team_id, tier (nível)
- `matches`: id, edition_id, rodada, data, mandante_id, visitante_id, gols_mandante, gols_visitante (nulos até o resultado)
- `participants`: id, nome de exibição, contato opcional (`user_id` existe, mas não é usado enquanto os participantes não têm conta)
- `entries` (palpites): id, edition_id, `name` (nome do palpite), participant_id (nulo até o admin atribuir), `selection_key` (chave canônica para achar palpites repetidos), criado em (a coluna `access_token` existe, mas não é usada)
- `entry_picks`: entry_id, tier, team_id
- `admins`: user_id

A `selection_key` é a lista de team_ids escolhidos, ordenada por nível e unida em texto. Palpites idênticos têm a mesma chave.

Todas as tabelas ficam no schema `bolao` do Postgres (não no `public`), porque o projeto Supabase é dividido com outro sistema.

---

## Páginas

Públicas (sem login):
- `/`: **classificação** da edição atual, com abas 1º turno / 2º turno (abre no turno em andamento). Mostra posição, nome do palpite, participante, pontos e os 10 escudos escolhidos. Busca pelo nome. Posições empatadas aparecem iguais, em ranking denso (ex.: 1º, 2º, 2º, 3º). Os premiados (1º, 2º, 3º e último) ficam em destaque. Se o turno estiver pendente por jogo adiado, um aviso aparece no topo.
- `/participantes`: lista, em ordem alfabética, dos participantes que têm palpite na edição em vigor; cada um com os nomes dos seus palpites embaixo e link para o perfil.
- `/participante/[id]`: perfil do participante, com os palpites da edição atual (pontuação por time e por rodada), o histórico nas edições anteriores e os troféus (ouro, prata, bronze e vermelho, com o número de vezes que ganhou cada prêmio).
- `/times`: pontuação de cada time da edição, organizada por nível, com o detalhamento (vitórias, empates, goleadas, fora de casa, bônus de fim de turno).
- `/campeonato`: tabela do turno e resultados por rodada.
- `/regras`: as regras da edição, geradas a partir do JSON em linguagem simples.
- `/historico` e `/historico/[edicao]`: edições anteriores, com os premiados de cada turno (1º, 2º, 3º e último) e a classificação final de cada turno.
- `/palpite`: formulário de palpite (só quando a edição está `open_for_entries`), seguido de uma tela de confirmação.

Admin (`/admin`, exige login de admin):
- **Lançar resultados**: lista de jogos por rodada com dois campos de placar em cada, salvando de uma vez e com o recálculo automático. Precisa ser rápido de usar no celular.
- **Edições**: criar e editar edição, níveis e times, e as regras (editor de JSON com validação e pré-visualização em texto). Ação "duplicar edição anterior" para reaproveitar regras.
- **Jogos**: cadastrar a tabela da temporada (importação por CSV).
- **Palpites**: revisar os palpites que chegam (ajustar o nome e atribuir a um participante), criar, editar ou excluir. Exportar a classificação em PDF ou imagem para mandar no WhatsApp.
- **Participantes**: cadastrar (só o nome), renomear e excluir participantes.
- **Times**: editar os dados de cada time e enviar o escudo.

---

## Participantes e palpites

Muitos participantes são leigos digitalmente. **Nenhuma ação pública exige conta, e os participantes não têm conta** (decisão do administrador para esta primeira fase; o login existe só para o admin).

- **Só o administrador cadastra participantes.** O cadastro é apenas o nome. Cada participante tem um perfil público e pode ter vários palpites.
- **Palpite pelo site:** no `/palpite`, a pessoa só dá um nome ao palpite e escolhe os times. O palpite entra **sem participante**.
- **Revisão pelo admin:** depois, o administrador ajusta os nomes dos palpites e atribui cada um a um participante já cadastrado.
- **Depois de enviado, só o administrador altera ou exclui um palpite.** Não há link de edição para quem palpitou.
- Dois palpites da mesma edição não podem ter o mesmo nome.
- O admin também pode cadastrar palpites por qualquer pessoa.
- **Palpite repetido:** antes de confirmar, verifique a `selection_key`. Se já existir um palpite igual, avise com uma mensagem amigável ("Já existe um palpite com exatamente esses times. Se terminarem empatados, dividem a posição e o prêmio. Quer manter ou trocar algum time?"). O aviso não bloqueia o envio.
- Depois do prazo, os palpites ficam travados.

---

## Diretrizes de interface

- **Mobile-first.** A maioria acessa pelo celular, a partir de um link no WhatsApp.
- Navegação simples com 5 abas: Classificação · Participantes · Times · Campeonato · Histórico.
- No desktop, o layout usa a largura da tela (colunas e grades); no celular, uma coluna só.
- Textos curtos e botões grandes. Nada de jargão técnico.
- Escudos dos times sempre que aparecer um time.
- Mostrar "Atualizado após a rodada X" no topo da classificação.
- Modo claro e escuro.

---

## Ordem de construção

1. Projeto base (Next.js, Tailwind, shadcn, Supabase), schema e seed da edição 2026 com os níveis e regras acima.
2. **Motor de cálculo + testes** (antes de qualquer tela).
3. Admin: lançar resultados e cadastrar palpites.
4. Páginas públicas: classificação, times, campeonato e regras.
5. Formulário de palpite sem conta, com aviso de repetido.
6. Participantes cadastrados pelo admin, revisão dos palpites, perfis e troféus.
7. Histórico e importação das edições antigas (planilhas).
8. (Futuro) Importar resultados automaticamente de uma API de futebol.

---

## Convenções

- Commits pequenos e descritivos, em português.
- Toda mudança no motor de cálculo precisa de teste.
- Segredos só em variáveis de ambiente (`.env.local` e Vercel). Nunca faça commit deles.
- Escrita no banco só pelo admin ou pelas rotas de palpite, protegidas por RLS.
- Ao mudar o modelo de dados, crie uma migration do Supabase em `supabase/migrations/`.
