import { describe, expect, it } from "vitest";
import { computeEdition, selectionKey } from "./engine";
import { formatPoints, formatPts, formatSigned, toTenths } from "./format";
import { rankEntries } from "./ranking";
import { matchRuleApplies, type MatchSide } from "./rules/match";
import { resolvePositions } from "./rules/periodEnd";
import { RULES_2026 } from "./rules2026";
import { parseRules } from "./schema";
import { describeRules } from "./describe";
import { computeStandings } from "./standings";
import type { EngineInput, MatchInput, MatchRule, PrizesConfig, Rules, TeamScore, Tiebreaker } from "./types";

// ---------- utilitários ----------

let seq = 0;
function match(round: number, home: string, away: string, hg: number | null, ag: number | null): MatchInput {
  return { id: `m${++seq}`, round, homeTeamId: home, awayTeamId: away, homeGoals: hg, awayGoals: ag };
}

const side = (over: Partial<MatchSide>): MatchSide => ({
  isHome: true,
  goalsFor: 0,
  goalsAgainst: 0,
  teamTier: 5,
  opponentTier: 5,
  ...over,
});

/** Liga de 4 times, turno único de 3 rodadas + 2º turno de 3 rodadas. */
const TEAMS = [
  { id: "A", tier: 1 },
  { id: "B", tier: 2 },
  { id: "C", tier: 9 },
  { id: "D", tier: 10 },
];

const SMALL_RULES: Rules = {
  ...RULES_2026,
  periods: [
    { id: "T1", name: "1º turno", rounds: [1, 3] },
    { id: "T2", name: "2º turno", rounds: [4, 6] },
  ],
  periodEndRules: [
    { type: "standing_position", positions: [1], points: 3, label: "Campeão do turno" },
    { type: "standing_position", positions: [2], points: 1, label: "Vice do turno" },
    { type: "standing_position", positions: [1, 2], teamTiers: [9, 10], points: 2, label: "Nível 9/10 no G2" },
    { type: "standing_position", positions: "last1", points: -3, label: "Rebaixado no turno" },
  ],
  tiebreakers: [{ type: "total_points" }, { type: "tier_points_sequence", tiers: [1, 2, 9, 10] }],
};

function input(matches: MatchInput[], over: Partial<EngineInput> = {}): EngineInput {
  return { rules: SMALL_RULES, teams: TEAMS, matches, entries: [], ...over };
}

/** 1º turno completo: A campeão (9), C vice (6), B 3º (3), D lanterna (0). */
function fullFirstPeriod(): MatchInput[] {
  return [
    match(1, "A", "B", 1, 0),
    match(1, "C", "D", 2, 1),
    match(2, "A", "C", 2, 1),
    match(2, "B", "D", 1, 0),
    match(3, "D", "A", 0, 1),
    match(3, "B", "C", 0, 1),
  ];
}

const totals = (r: ReturnType<typeof computeEdition>, periodIndex = 0) =>
  Object.fromEntries(
    Object.values(r.periods[periodIndex].teamScores).map((s) => [s.teamId, s.tenths]),
  );

// ---------- formatação ----------

describe("formatação em décimos", () => {
  it("converte e formata com vírgula", () => {
    expect(toTenths(0.5)).toBe(5);
    expect(toTenths(-2)).toBe(-20);
    expect(formatPoints(125)).toBe("12,5");
    expect(formatPoints(120)).toBe("12");
    expect(formatPoints(-5)).toBe("−0,5");
    expect(formatSigned(5)).toBe("+0,5");
    expect(formatSigned(-30)).toBe("−3");
    expect(formatPts(10)).toBe("1 pt");
    expect(formatPts(35)).toBe("3,5 pts");
  });

  it("somar 0,5 várias vezes não gera erro de ponto flutuante", () => {
    // 3 vitórias fora de casa por 1x0: 3 × (3 + 0,5) = 10,5
    const r = computeEdition(
      input([match(1, "B", "A", 0, 1), match(2, "C", "A", 0, 1), match(3, "D", "A", 0, 1)], {
        rules: { ...SMALL_RULES, periodEndRules: [] },
      }),
    );
    expect(totals(r).A).toBe(105);
  });
});

// ---------- tipos de regra por jogo ----------

describe("regras por jogo", () => {
  it("win / draw / loss", () => {
    expect(matchRuleApplies({ type: "win", points: 3 }, side({ goalsFor: 1 }))).toBe(true);
    expect(matchRuleApplies({ type: "win", points: 3 }, side({}))).toBe(false);
    expect(matchRuleApplies({ type: "draw", points: 1 }, side({ goalsFor: 2, goalsAgainst: 2 }))).toBe(true);
    expect(matchRuleApplies({ type: "draw", points: 1 }, side({ goalsFor: 1 }))).toBe(false);
    expect(matchRuleApplies({ type: "loss", points: -1 }, side({ goalsAgainst: 1 }))).toBe(true);
    expect(matchRuleApplies({ type: "loss", points: -1 }, side({}))).toBe(false);
  });

  it("win_by_margin: exatamente a margem mínima já conta", () => {
    const rule = { type: "win_by_margin", minMargin: 3, points: 2 } as const;
    expect(matchRuleApplies(rule, side({ goalsFor: 3, goalsAgainst: 0 }))).toBe(true);
    expect(matchRuleApplies(rule, side({ goalsFor: 5, goalsAgainst: 1 }))).toBe(true);
    expect(matchRuleApplies(rule, side({ goalsFor: 3, goalsAgainst: 1 }))).toBe(false);
    expect(matchRuleApplies(rule, side({ goalsFor: 0, goalsAgainst: 3 }))).toBe(false);
  });

  it("loss_by_margin", () => {
    const rule = { type: "loss_by_margin", minMargin: 3, points: -2 } as const;
    expect(matchRuleApplies(rule, side({ goalsFor: 0, goalsAgainst: 3 }))).toBe(true);
    expect(matchRuleApplies(rule, side({ goalsFor: 1, goalsAgainst: 3 }))).toBe(false);
    expect(matchRuleApplies(rule, side({ goalsFor: 3, goalsAgainst: 0 }))).toBe(false);
  });

  it("away_win: só o visitante que vence", () => {
    const rule = { type: "away_win", points: 0.5 } as const;
    expect(matchRuleApplies(rule, side({ isHome: false, goalsFor: 1 }))).toBe(true);
    expect(matchRuleApplies(rule, side({ isHome: true, goalsFor: 1 }))).toBe(false);
    expect(matchRuleApplies(rule, side({ isHome: false, goalsFor: 1, goalsAgainst: 1 }))).toBe(false);
  });

  it("win_vs_tiers: depende do nível dos dois times", () => {
    const rule: MatchRule = { type: "win_vs_tiers", teamTiers: [9, 10], opponentTiers: [1, 2], points: 1 };
    expect(matchRuleApplies(rule, side({ goalsFor: 1, teamTier: 9, opponentTier: 2 }))).toBe(true);
    expect(matchRuleApplies(rule, side({ goalsFor: 1, teamTier: 8, opponentTier: 2 }))).toBe(false);
    expect(matchRuleApplies(rule, side({ goalsFor: 1, teamTier: 10, opponentTier: 3 }))).toBe(false);
    expect(matchRuleApplies(rule, side({ goalsFor: 1, goalsAgainst: 1, teamTier: 10, opponentTier: 1 }))).toBe(false);
    expect(matchRuleApplies(rule, side({ goalsFor: 1, teamTier: undefined, opponentTier: 1 }))).toBe(false);
  });

  it("os extras são cumulativos e geram um lançamento por regra", () => {
    // D (nível 10) vence A (nível 1) fora de casa por 4x0:
    // vitória 3 + goleada 2 + fora 0,5 + nível 9/10 sobre 1/2 1 = 6,5
    const r = computeEdition(input([match(1, "A", "D", 0, 4)]));
    const d = r.periods[0].teamScores.D;
    expect(d.tenths).toBe(65);
    expect(d.items.map((i) => i.ruleType).sort()).toEqual(
      ["away_win", "win", "win_by_margin", "win_vs_tiers"].sort(),
    );
    expect(d.items.every((i) => i.source === "match" && i.round === 1 && i.matchId)).toBe(true);
    // A sofre goleada: −2
    expect(r.periods[0].teamScores.A.tenths).toBe(-20);
  });

  it("empate dá 1 ponto para cada lado", () => {
    const r = computeEdition(input([match(1, "A", "B", 2, 2)]));
    expect(totals(r)).toMatchObject({ A: 10, B: 10, C: 0, D: 0 });
  });

  it("jogo sem resultado não pontua", () => {
    const r = computeEdition(input([match(1, "A", "B", null, null)]));
    expect(totals(r)).toMatchObject({ A: 0, B: 0 });
    expect(r.periods[0].status).toBe("not_started");
  });
});

// ---------- tabela do campeonato ----------

describe("tabela do campeonato", () => {
  const ids = ["A", "B", "C", "D"];

  it("ordena por pontos, vitórias, saldo e gols pró", () => {
    const rows = computeStandings(ids, [
      match(1, "A", "B", 3, 0), // A 3 pts, saldo +3
      match(1, "C", "D", 1, 0), // C 3 pts, saldo +1
    ]);
    expect(rows.map((r) => r.teamId)).toEqual(["A", "C", "D", "B"]);
    expect(rows[0]).toMatchObject({ position: 1, points: 3, wins: 1, goalDifference: 3, played: 1 });
    expect(rows[3]).toMatchObject({ position: 4, losses: 1, goalsAgainst: 3 });
  });

  it("vitórias vêm antes do saldo", () => {
    // A: 1V 0E 2D = 3 pts; B: 0V 3E = 3 pts -> A na frente por vitórias
    const rows = computeStandings(ids, [
      match(1, "A", "C", 1, 0),
      match(2, "A", "D", 0, 5),
      match(3, "A", "D", 0, 5),
      match(1, "B", "D", 0, 0),
      match(2, "B", "C", 1, 1),
      match(3, "B", "C", 2, 2),
    ]);
    const pos = (id: string) => rows.find((r) => r.teamId === id)!.position;
    expect(pos("A")).toBeLessThan(pos("B"));
  });

  it("gols pró desempata saldo igual", () => {
    const rows = computeStandings(ids, [match(1, "A", "C", 3, 2), match(1, "B", "D", 1, 0)]);
    expect(rows.map((r) => r.teamId).slice(0, 2)).toEqual(["A", "B"]);
  });

  it("confronto direto decide empate entre dois clubes", () => {
    // A e B terminam com 3 pts, 1 vitória, saldo 0, 1 gol pró; B venceu A.
    const rows = computeStandings(ids, [
      match(1, "B", "A", 1, 0),
      match(2, "A", "C", 1, 0),
      match(2, "D", "B", 1, 0),
    ]);
    const a = rows.find((r) => r.teamId === "A")!;
    const b = rows.find((r) => r.teamId === "B")!;
    expect(b.position).toBeLessThan(a.position);
    expect(b.unresolvedTie).toBe(false);
  });

  it("empate que sobra fica marcado e pode ser resolvido pela ordem manual", () => {
    const games = [match(1, "A", "B", 1, 1), match(1, "C", "D", 0, 0)];
    const auto = computeStandings(ids, games);
    expect(auto.map((r) => r.teamId)).toEqual(["A", "B", "C", "D"]);
    expect(auto.map((r) => r.unresolvedTie)).toEqual([true, true, true, true]);

    const manual = computeStandings(ids, games, undefined, ["B", "A", "D", "C"]);
    expect(manual.map((r) => r.teamId)).toEqual(["B", "A", "D", "C"]);
    expect(manual.every((r) => !r.unresolvedTie)).toBe(true);
  });

  it("a ordem manual nunca passa por cima dos critérios automáticos", () => {
    const rows = computeStandings(ids, [match(1, "A", "B", 1, 0)], undefined, ["B", "A", "C", "D"]);
    expect(rows[0].teamId).toBe("A");
    expect(rows[3].teamId).toBe("B");
  });
});

// ---------- fim de turno ----------

describe("regras de fim de turno (standing_position)", () => {
  it('resolve "lastN" e listas', () => {
    expect(resolvePositions("last4", 20)).toEqual([17, 18, 19, 20]);
    expect(resolvePositions([1, 2], 20)).toEqual([1, 2]);
    expect(resolvePositions("last4", 3)).toEqual([1, 2, 3]);
  });

  it("aplica campeão, vice, nível 9/10 no topo e rebaixado quando o turno termina", () => {
    const r = computeEdition(input(fullFirstPeriod()));
    const p = r.periods[0];
    expect(p.status).toBe("final");
    expect(p.standings.map((s) => s.teamId)).toEqual(["A", "C", "B", "D"]);
    const bonus = (id: string) =>
      p.teamScores[id].items.filter((i) => i.source === "period_end").map((i) => [i.label, i.tenths]);
    expect(bonus("A")).toEqual([["Campeão do turno", 30]]);
    // C é vice (+1) e é nível 9 entre os 2 primeiros (+2): cumulativo
    expect(bonus("C")).toEqual([
      ["Vice do turno", 10],
      ["Nível 9/10 no G2", 20],
    ]);
    expect(bonus("B")).toEqual([]);
    expect(bonus("D")).toEqual([["Rebaixado no turno", -30]]);
    // A: 3 vitórias (9) + 1 fora (0,5) + campeão (3) = 12,5
    expect(p.teamScores.A.tenths).toBe(125);
    expect(p.projectedPeriodEnd).toEqual([]);
  });

  it("a regra com teamTiers ignora times de outros níveis", () => {
    const r = computeEdition(input(fullFirstPeriod()));
    const a = r.periods[0].teamScores.A.items.map((i) => i.label);
    expect(a).not.toContain("Nível 9/10 no G2");
  });

  it("com o turno em andamento os bônus ficam só como projeção", () => {
    const r = computeEdition(input(fullFirstPeriod().slice(0, 4)));
    const p = r.periods[0];
    expect(p.status).toBe("in_progress");
    expect(Object.values(p.teamScores).flatMap((s) => s.items).some((i) => i.source === "period_end")).toBe(false);
    expect(p.projectedPeriodEnd.length).toBeGreaterThan(0);
  });
});

// ---------- turnos isolados e jogo adiado ----------

describe("turnos", () => {
  it("o 2º turno começa do zero (pontuação e tabela)", () => {
    const r = computeEdition(input([...fullFirstPeriod(), match(4, "D", "A", 2, 0)]));
    const [t1, t2] = r.periods;
    expect(t1.status).toBe("final");
    expect(t2.status).toBe("in_progress");
    expect(totals(r, 1)).toEqual({ A: 0, B: 0, C: 0, D: 30 + 10 }); // vitória + nível 10 sobre nível 1
    expect(t2.standings[0]).toMatchObject({ teamId: "D", points: 3, played: 1 });
    expect(t2.standings.find((s) => s.teamId === "A")).toMatchObject({ points: 0, played: 1 });
    expect(t2.lastRoundWithResult).toBe(4);
    // e o 1º turno não muda por causa do jogo da rodada 4
    expect(t1.teamScores.A.tenths).toBe(125);
  });

  it("turno sem nenhum resultado fica como não iniciado", () => {
    const r = computeEdition(input(fullFirstPeriod()));
    expect(r.periods[1].status).toBe("not_started");
    expect(r.periods[1].lastRoundWithResult).toBe(0);
  });

  it("jogo adiado deixa o turno PENDENTE: sem bônus de fim de turno", () => {
    const games = fullFirstPeriod();
    const postponed = games[3]; // B x D, rodada 2
    postponed.homeGoals = null;
    postponed.awayGoals = null;
    const r = computeEdition(input([...games, match(4, "A", "B", 1, 0)]));
    const t1 = r.periods[0];
    expect(t1.status).toBe("pending");
    expect(t1.postponedMatches.map((m) => m.id)).toEqual([postponed.id]);
    expect(Object.values(t1.teamScores).flatMap((s) => s.items).some((i) => i.source === "period_end")).toBe(false);
    expect(t1.projectedPeriodEnd.length).toBeGreaterThan(0);
    // A ainda sem o bônus de campeão: 9 + 0,5
    expect(t1.teamScores.A.tenths).toBe(95);
  });

  it("o adiado, quando acontece, conta para o turno da sua rodada e libera os bônus", () => {
    const games = fullFirstPeriod();
    const r = computeEdition(
      input([...games, match(4, "A", "B", 1, 0), match(5, "C", "D", 1, 1)]),
    );
    const [t1, t2] = r.periods;
    expect(t1.status).toBe("final");
    expect(t1.teamScores.B.tenths).toBe(30); // vitória sobre D na rodada 2, disputada "depois"
    expect(t1.teamScores.A.tenths).toBe(125);
    // nada do jogo da rodada 2 vaza para o 2º turno
    expect(t2.teamScores.B.tenths).toBe(0);
    expect(t2.teamScores.D.tenths).toBe(10);
  });

  it("jogo sem resultado da rodada atual não é adiado: turno em andamento", () => {
    const games = fullFirstPeriod();
    games[5].homeGoals = null;
    games[5].awayGoals = null; // rodada 3, a última com resultados
    const r = computeEdition(input(games));
    expect(r.periods[0].status).toBe("in_progress");
    expect(r.periods[0].postponedMatches).toEqual([]);
    expect(r.periods[0].missingMatches).toHaveLength(1);
  });

  it("turno com rodadas ainda não cadastradas nunca é dado como encerrado", () => {
    const r = computeEdition(input(fullFirstPeriod().filter((m) => m.round < 3)));
    expect(r.periods[0].status).toBe("in_progress");
  });
});

// ---------- classificação do bolão, desempates e prêmios ----------

const PRIZES: PrizesConfig = { scope: "per_period", positions: [1, 2, 3, "last"], ranking: "dense", tieBehavior: "split" };
const TB: Tiebreaker[] = [{ type: "total_points" }, { type: "tier_points_sequence", tiers: [1, 2] }];

function scores(map: Record<string, number>): Record<string, TeamScore> {
  return Object.fromEntries(
    Object.entries(map).map(([teamId, tenths]) => [teamId, { teamId, tier: 0, tenths, items: [] }]),
  );
}
const entry = (id: string, t1: string, t2: string) => ({ id, picks: { 1: t1, 2: t2 } });
const view = (rows: ReturnType<typeof rankEntries>) =>
  rows.map((r) => `${r.entryId}:${r.position}${r.prizes.length ? `[${r.prizes.join(",")}]` : ""}`);

describe("classificação do bolão", () => {
  it("o total é a soma dos times escolhidos, com detalhe por nível", () => {
    const rows = rankEntries([entry("x", "a", "b")], scores({ a: 125, b: -20 }), TB, PRIZES);
    expect(rows[0]).toMatchObject({ tenths: 105, tierTenths: { 1: 125, 2: -20 }, position: 1 });
  });

  it("desempata pelo time do nível 1, depois nível 2", () => {
    // todos somam 10 pontos
    const s = scores({ a1: 70, a2: 60, b1: 30, b2: 40, b3: 35 });
    const rows = rankEntries(
      [entry("p", "a2", "b2"), entry("q", "a1", "b1"), entry("r", "a2", "b2x")],
      { ...s, b2x: { teamId: "b2x", tier: 2, tenths: 40, items: [] } },
      TB,
      PRIZES,
    );
    // q tem o melhor nível 1; p e r empatam em tudo
    expect(view(rows)).toEqual(["q:1[1]", "p:2[2]", "r:2[2]"]);
  });

  it("nível 2 decide quando o nível 1 também empata", () => {
    const s = scores({ a1: 50, a2: 50, b1: 30, b2: 30, c1: 20, c2: 20 });
    const rows = rankEntries(
      [
        { id: "p", picks: { 1: "a1", 2: "c1", 3: "b1" } },
        { id: "q", picks: { 1: "a2", 2: "b2", 3: "c2" } },
      ],
      s,
      [{ type: "total_points" }, { type: "tier_points_sequence", tiers: [1, 2, 3] }],
      PRIZES,
    );
    expect(rows.map((r) => r.entryId)).toEqual(["q", "p"]);
    expect(rows.map((r) => r.position)).toEqual([1, 2]);
  });

  it("empate total (palpites idênticos) divide a posição", () => {
    const rows = rankEntries(
      [entry("p", "a", "b"), entry("q", "a", "b"), entry("r", "c", "b")],
      scores({ a: 50, b: 10, c: 20 }),
      TB,
      PRIZES,
    );
    expect(view(rows)).toEqual(["p:1[1]", "q:1[1]", "r:2[2]"]);
    expect(rows[0].sharedWith).toBe(2);
    expect(rows[2].sharedWith).toBe(1);
  });

  it("exemplo da premiação: A 80; B, C e D 75; E 70 -> 1º, 2º, 2º, 2º, 3º", () => {
    const s = scores({ a: 800, bcd: 750, e: 700, f: 100, zero: 0 });
    const rows = rankEntries(
      [
        entry("E", "e", "zero"),
        entry("C", "bcd", "zero"),
        entry("A", "a", "zero"),
        entry("F", "f", "zero"),
        entry("D", "bcd", "zero"),
        entry("B", "bcd", "zero"),
      ],
      s,
      TB,
      PRIZES,
    );
    expect(view(rows)).toEqual(["A:1[1]", "B:2[2]", "C:2[2]", "D:2[2]", "E:3[3]", "F:4[last]"]);
    expect(rows.filter((r) => r.prizes.includes(2)).every((r) => r.sharedWith === 3)).toBe(true);
  });

  it("empate no último lugar: o grupo divide o prêmio de último", () => {
    const s = scores({ a: 80, b: 70, c: 60, d: 50, e: 10, zero: 0 });
    const rows = rankEntries(
      [
        entry("1", "a", "zero"),
        entry("2", "b", "zero"),
        entry("3", "c", "zero"),
        entry("4", "d", "zero"),
        entry("5", "e", "zero"),
        entry("6", "e", "zero"),
      ],
      s,
      TB,
      PRIZES,
    );
    expect(view(rows)).toEqual(["1:1[1]", "2:2[2]", "3:3[3]", "4:4", "5:5[last]", "6:5[last]"]);
    expect(rows[5].sharedWith).toBe(2);
  });

  it("com poucos palpites, quem já está numa posição premiada não leva também o de último", () => {
    const rows = rankEntries(
      [entry("1", "a", "zero"), entry("2", "b", "zero")],
      scores({ a: 80, b: 70, zero: 0 }),
      TB,
      PRIZES,
    );
    expect(view(rows)).toEqual(["1:1[1]", "2:2[2]"]);
  });

  it("pontos negativos e palpite sem escolha num nível", () => {
    const rows = rankEntries(
      [{ id: "p", picks: { 1: "a" } }, entry("q", "a", "b")],
      scores({ a: 10, b: -30 }),
      TB,
      { ...PRIZES, positions: [1] },
    );
    expect(view(rows)).toEqual(["p:1[1]", "q:2"]);
    expect(rows[1].tenths).toBe(-20);
  });

  it("integração: o motor soma por time e classifica por turno", () => {
    const entries = [
      { id: "e1", picks: { 1: "A", 2: "B", 9: "C", 10: "D" } },
    ];
    const r = computeEdition(input(fullFirstPeriod(), { entries }));
    const row = r.periods[0].ranking[0];
    // A 12,5 + B 3 + C (2 vitórias 6 + fora 0,5 + nível 9 sobre nível 2 1 + vice 1 + G2 2 = 10,5) + D (−3) = 23
    expect(row.tierTenths).toEqual({ 1: 125, 2: 30, 9: 105, 10: -30 });
    expect(row.tenths).toBe(230);
    expect(r.periods[1].ranking[0].tenths).toBe(0);
  });
});

// ---------- configuração ----------

describe("configuração das regras", () => {
  it("as regras de 2026 são válidas", () => {
    expect(parseRules(RULES_2026)).toMatchObject({ ok: true });
    expect(parseRules(JSON.parse(JSON.stringify(RULES_2026))).ok).toBe(true);
  });

  it("rejeita tipo desconhecido, pontos com duas casas e turnos sobrepostos", () => {
    const bad = (patch: object) => parseRules({ ...RULES_2026, ...patch });
    expect(bad({ matchRules: [{ type: "gol_de_bicicleta", points: 1 }] }).ok).toBe(false);
    expect(bad({ matchRules: [{ type: "win", points: 0.25 }] }).ok).toBe(false);
    expect(
      bad({
        periods: [
          { id: "T1", name: "1º", rounds: [1, 19] },
          { id: "T2", name: "2º", rounds: [19, 38] },
        ],
      }).ok,
    ).toBe(false);
    expect(bad({ periodEndRules: [{ type: "standing_position", positions: "ultimos4", points: -3 }] }).ok).toBe(false);
    const result = bad({ tiebreakers: [] });
    expect(result.ok === false && result.errors.length > 0).toBe(true);
  });

  it("gera a descrição em português", () => {
    const d = describeRules(RULES_2026);
    expect(d.matchRules[0]).toEqual({ text: "Vitória", points: "+3" });
    expect(d.matchRules[2]).toEqual({ text: "Vitória por goleada (3 ou mais gols de diferença)", points: "+2" });
    expect(d.matchRules[3].points).toBe("+0,5");
    expect(d.matchRules[4].text).toBe("Vitória de time do níveis 9 ou 10 sobre time do níveis 1 ou 2".replace(/do níveis/g, "dos níveis"));
    expect(d.periodEndRules[3]).toEqual({
      text: "Rebaixado no turno (time entre os 4 últimos no fim do turno)",
      points: "−3",
    });
    expect(d.periods).toEqual(["1º turno: rodadas 1 a 19", "2º turno: rodadas 20 a 38"]);
  });

  it("selectionKey ordena por nível e identifica palpites idênticos", () => {
    expect(selectionKey({ 2: "y", 1: "x", 10: "z" })).toBe("x|y|z");
    expect(selectionKey({ 1: "x", 2: "y" })).toBe(selectionKey({ 2: "y", 1: "x" }));
    expect(selectionKey({ 1: "x", 2: "y" })).not.toBe(selectionKey({ 1: "y", 2: "x" }));
  });
});

// ---------- regras de 2026 de ponta a ponta ----------

describe("edição 2026", () => {
  it("vitória de nível 10 sobre nível 1 fora de casa por goleada vale 6,5", () => {
    const teams = [
      { id: "fla", tier: 1 },
      { id: "remo", tier: 10 },
    ];
    const r = computeEdition({
      rules: RULES_2026,
      teams,
      matches: [match(1, "fla", "remo", 0, 3)],
      entries: [],
    });
    expect(r.periods[0].teamScores.remo.tenths).toBe(65);
    expect(r.periods[0].teamScores.fla.tenths).toBe(-20);
  });
});
