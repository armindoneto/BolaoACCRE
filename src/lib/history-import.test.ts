import { describe, expect, it } from "vitest";
import { parseHistory, parseTenths } from "./history-import";

const TEAMS = [
  "nível\ttime\tetapa\ttotal\tVitórias\tEmpates\tRebaixado",
  "1\tFlamengo\t1\t30,5\t27\t3,5\t",
  "1\tPalmeiras\t1\t20\t\t\t",
  "2\tCruzeiro\t1\t\t12\t3\t",
  "2\tMirassol\t1\t-1\t0\t2\t-3",
  "1\tFlamengo\t2º turno\t10\t\t\t",
  "1\tPalmeiras\t2\t11\t\t\t",
  "2\tCruzeiro\t2\t12\t\t\t",
  "2\tMirassol\t2\t13\t\t\t",
].join("\n");

const ENTRIES = [
  "palpite\tparticipante\tN1\tN2\tpos 1\tpts 1\tpts 2",
  "Ana 1\tAna\tFlamengo\tCruzeiro\t1º\t45,5\t22",
  "Ana 2\tAna\tpalmeiras\tMIR\t3\t19\t24",
  "Do Zé\t\tFlamengo\tMirassol\t2\t29,5\t23",
].join("\n");

const run = (over: Partial<Parameters<typeof parseHistory>[0]> = {}) =>
  parseHistory({
    periodNames: ["1º turno", "2º turno"],
    teamsText: TEAMS,
    entriesText: ENTRIES,
    aliases: { MIR: "Mirassol" },
    ...over,
  });

describe("importação de bolão antigo", () => {
  it("lê números com vírgula, ponto e sinal", () => {
    expect(parseTenths("12,5")).toBe(125);
    expect(parseTenths("12.5")).toBe(125);
    expect(parseTenths("−3")).toBe(-30);
    expect(parseTenths("0")).toBe(0);
    expect(parseTenths("1,25")).toBeUndefined();
    expect(parseTenths("abc")).toBeUndefined();
  });

  it("lê times, detalhamento, palpites, posições e confere os pontos", () => {
    const result = run();
    if (!result.ok) throw new Error(result.errors.join("\n"));
    const { data } = result;
    expect(data.periods).toEqual(["1º turno", "2º turno"]);
    expect(data.tiers).toEqual([
      { tier: 1, teamNames: ["Flamengo", "Palmeiras"] },
      { tier: 2, teamNames: ["Cruzeiro", "Mirassol"] },
    ]);
    expect(data.teamScores[0].get("Flamengo")).toEqual({
      tenths: 305,
      items: [
        { label: "Vitórias", tenths: 270 },
        { label: "Empates", tenths: 35 },
      ],
    });
    // total vazio: vale a soma do detalhamento
    expect(data.teamScores[0].get("Cruzeiro")!.tenths).toBe(150);
    // detalhamento com zero é ignorado; negativo entra
    expect(data.teamScores[0].get("Mirassol")).toEqual({
      tenths: -10,
      items: [
        { label: "Empates", tenths: 20 },
        { label: "Rebaixado", tenths: -30 },
      ],
    });
    expect(data.teamScores[1].get("Flamengo")!.tenths).toBe(100);
    expect(data.entries).toEqual([
      { name: "Ana 1", participant: "Ana", picks: { 1: "Flamengo", 2: "Cruzeiro" }, positions: [1, undefined] },
      { name: "Ana 2", participant: "Ana", picks: { 1: "Palmeiras", 2: "Mirassol" }, positions: [3, undefined] },
      { name: "Do Zé", participant: null, picks: { 1: "Flamengo", 2: "Mirassol" }, positions: [2, undefined] },
    ]);
  });

  it("aceita ponto e vírgula como separador", () => {
    const result = run({ teamsText: TEAMS.replace(/\t/g, ";"), entriesText: ENTRIES.replace(/\t/g, ";") });
    expect(result.ok).toBe(true);
  });

  it("aponta total que não bate com o detalhamento", () => {
    const result = run({ teamsText: TEAMS.replace("1\tFlamengo\t1\t30,5", "1\tFlamengo\t1\t31") });
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining(["Times, linha 2: o total de Flamengo é 31, mas o detalhamento soma 30,5."]),
    });
  });

  it("aponta pontos do palpite que não batem com a soma dos times", () => {
    const result = run({ entriesText: ENTRIES.replace("45,5", "46") });
    expect(result.ok === false && result.errors).toEqual([
      "Palpites, linha 2: Ana 1 tem 46 pts na planilha (1º turno), mas os times dele somam 45,5.",
    ]);
  });

  it("aponta time de nível errado, palpite repetido e posições pela metade", () => {
    const bad = [
      "palpite\tparticipante\tN1\tN2\tpos 1",
      "Ana 1\tAna\tCruzeiro\tMirassol\t1",
      "Ana 2\tAna\tFlamengo\tMirassol\t",
      "ana 2\tAna\tFlamengo\tCruzeiro\t2",
      "Bia\tBia\tFlamengo\tCruzeiro\t2",
    ].join("\n");
    const result = run({ entriesText: bad });
    expect(result.ok === false && result.errors).toEqual([
      'Palpites, linha 2: "Cruzeiro" não é um time do nível 1.',
      'Palpites, linha 4: já existe outro palpite chamado "ana 2".',
      "Palpites: na etapa 1º turno, só 1 de 2 palpites têm posição. Preencha todos ou nenhum.",
    ]);
  });

  it("aponta time faltando numa etapa e etapa inexistente", () => {
    const missing = run({ teamsText: TEAMS.split("\n").slice(0, 8).join("\n") });
    expect(missing.ok === false && missing.errors).toContain("Times: falta a linha de Mirassol na etapa 2º turno.");
    const wrong = run({ teamsText: TEAMS.replace("1\tPalmeiras\t2\t11", "1\tPalmeiras\t3\t11") });
    expect(wrong.ok === false && wrong.errors[0]).toMatch(/etapa "3" não existe/);
  });
});
