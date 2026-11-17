import { describe, expect, it } from "vitest";
import { buildImportedResult } from "./imported";
import { RULES_2026 } from "./rules2026";
import type { ImportedResults, Rules } from "./types";

const rules: Rules = {
  ...RULES_2026,
  tiebreakers: [{ type: "total_points" }, { type: "tier_points_sequence", tiers: [1, 2] }],
};
const teams = [
  { id: "a1", tier: 1 },
  { id: "a2", tier: 1 },
  { id: "b1", tier: 2 },
  { id: "b2", tier: 2 },
];
const entries = [
  { id: "e1", picks: { 1: "a1", 2: "b1" } },
  { id: "e2", picks: { 1: "a2", 2: "b2" } },
  { id: "e3", picks: { 1: "a1", 2: "b2" } },
  { id: "e4", picks: { 1: "a2", 2: "b1" } },
  { id: "e5", picks: { 1: "a2", 2: "b1" } },
];
const imported: ImportedResults = {
  periods: [
    {
      id: "T1",
      teamScores: {
        a1: {
          tenths: 305,
          items: [
            { label: "Vitória", tenths: 270, detail: "22ª Rodada" },
            { label: "Vitória fora de casa", tenths: 35 },
          ],
        },
        a2: { tenths: 200, items: [] },
        b1: { tenths: 150, items: [] },
        b2: { tenths: -20, items: [{ label: "Rebaixado", tenths: -30 }, { label: "Empate", tenths: 10 }] },
      },
    },
    { id: "T2", teamScores: { a1: { tenths: 100, items: [] } } },
  ],
};
const view = (rows: { entryId: string; position: number; prizes: unknown[] }[]) =>
  rows.map((r) => `${r.entryId}:${r.position}${r.prizes.length ? `[${r.prizes.join(",")}]` : ""}`);

describe("edição importada", () => {
  const result = buildImportedResult({ rules, teams, entries, imported });

  it("toda etapa é final e não tem tabela nem jogos", () => {
    expect(result.periods.map((p) => p.status)).toEqual(["final", "final"]);
    expect(result.periods[0].standings).toEqual([]);
    expect(result.periods[0].missingMatches).toEqual([]);
  });

  it("os pontos dos times vêm prontos, com o detalhamento", () => {
    const a1 = result.periods[0].teamScores.a1;
    expect(a1.tenths).toBe(305);
    expect(a1.items.map((i) => [i.source, i.label, i.tenths, i.detail])).toEqual([
      ["imported", "Vitória", 270, "22ª Rodada"],
      ["imported", "Vitória fora de casa", 35, undefined],
    ]);
    // time sem dados na etapa fica com zero
    expect(result.periods[1].teamScores.b1.tenths).toBe(0);
  });

  it("o total do palpite é a soma dos times, e a posição sai do desempate da edição", () => {
    const [t1, t2] = result.periods;
    expect(t1.ranking.find((r) => r.entryId === "e1")).toMatchObject({ tenths: 455, position: 1 });
    expect(t1.ranking.find((r) => r.entryId === "e2")!.tenths).toBe(180);
    // e4 e e5 são idênticos e dividem a posição
    expect(view(t1.ranking)).toEqual(["e1:1[1]", "e4:2[2]", "e5:2[2]", "e3:3[3]", "e2:4[last]"]);
    // na 2ª etapa só a1 pontuou: e1 e e3 empatam em tudo
    expect(view(t2.ranking)).toEqual(["e1:1[1]", "e3:1[1]", "e2:2[2]", "e4:2[2]", "e5:2[2]"]);
  });

  it("a posição informada na planilha vale mais que a calculada", () => {
    const withPositions = buildImportedResult({
      rules,
      teams,
      entries,
      imported: {
        periods: [
          { ...imported.periods[0], positions: { e3: 1, e1: 2, e4: 3, e5: 3, e2: 5 } },
          imported.periods[1],
        ],
      },
    });
    // ranking denso: o 5 da planilha vira 4º, e leva o prêmio de último
    expect(view(withPositions.periods[0].ranking)).toEqual(["e3:1[1]", "e1:2[2]", "e4:3[3]", "e5:3[3]", "e2:4[last]"]);
    expect(withPositions.periods[0].ranking[2].sharedWith).toBe(2);
    // os pontos não mudam por causa da posição informada
    expect(withPositions.periods[0].ranking[0].tenths).toBe(285);
  });
});
