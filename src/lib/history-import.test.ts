import { describe, expect, it } from "vitest";
import { parseHistory, parseTenths } from "./history-import";

const TIERS = "1: Flamengo, Palmeiras\n2: Cruzeiro, Mirassol";

const POINTS = [
  "1º turno",
  "flamengo",
  "3,0\tVitória\t1ª Rodada",
  "0,5\tVitória fora de casa\t1ª Rodada",
  "1,0\tEmpate\t2ª Rodada",
  "Palmeiras",
  "20\tPontos do turno",
  "Cruzeiro",
  "3,0\tVitória\t1ª Rodada",
  "MIR",
  "2,0\tEmpates",
  "-3,0\tRebaixado no turno",
  "",
  "2º turno",
  "Flamengo",
  "1,0\tEmpate\t21ª Rodada",
  "3,0\tVitória\t22ª Rodada",
  "0,5\tVitória fora de casa\t22ª Rodada",
  "Palmeiras",
  "11\tTotal",
  "Cruzeiro",
  "12\tTotal",
  "Mirassol",
  "13\tTotal",
].join("\n");

const ENTRIES = [
  "palpite\tparticipante\tN1\tN2\tpos 1\tpts 1\tpts 2",
  "Ana 1\tAna\tFlamengo\tCruzeiro\t3º\t7,5\t16,5",
  "Ana 2\tAna\tpalmeiras\tMIR\t1\t19\t24",
  "Do Zé\t\tFlamengo\tMirassol\t2\t3,5\t17,5",
].join("\n");

const run = (over: Partial<Parameters<typeof parseHistory>[0]> = {}) =>
  parseHistory({
    periodNames: ["1º turno", "2º turno"],
    tiersText: TIERS,
    pointsText: POINTS,
    entriesText: ENTRIES,
    aliases: { MIR: "Mirassol" },
    ...over,
  });

const errorsOf = (result: ReturnType<typeof run>) => (result.ok ? [] : result.errors);

describe("importação de bolão antigo", () => {
  it("lê números com vírgula, ponto e sinal", () => {
    expect(parseTenths("12,5")).toBe(125);
    expect(parseTenths("12.5")).toBe(125);
    expect(parseTenths("1,0")).toBe(10);
    expect(parseTenths("−3")).toBe(-30);
    expect(parseTenths("0")).toBe(0);
    expect(parseTenths("1,25")).toBeUndefined();
    expect(parseTenths("abc")).toBeUndefined();
  });

  it("lê os lançamentos de cada time, guardando a descrição como foi escrita", () => {
    const result = run();
    if (!result.ok) throw new Error(result.errors.join("\n"));
    const { data } = result;
    expect(data.periods).toEqual(["1º turno", "2º turno"]);
    expect(data.tiers).toEqual([
      { tier: 1, teamNames: ["Flamengo", "Palmeiras"] },
      { tier: 2, teamNames: ["Cruzeiro", "Mirassol"] },
    ]);
    // o total é a soma dos lançamentos; o complemento (rodada) vai junto
    expect(data.teamScores[0].get("Flamengo")).toEqual({
      tenths: 45,
      items: [
        { label: "Vitória", tenths: 30, detail: "1ª Rodada" },
        { label: "Vitória fora de casa", tenths: 5, detail: "1ª Rodada" },
        { label: "Empate", tenths: 10, detail: "2ª Rodada" },
      ],
    });
    // descrição livre, sem complemento, com negativo; time reconhecido pela sigla
    expect(data.teamScores[0].get("Mirassol")).toEqual({
      tenths: -10,
      items: [
        { label: "Empates", tenths: 20 },
        { label: "Rebaixado no turno", tenths: -30 },
      ],
    });
    // a linha "2º turno" muda a etapa dos times seguintes
    expect(data.teamScores[1].get("Flamengo")!.tenths).toBe(45);
    expect(data.teamScores[1].get("Flamengo")!.items[1]).toEqual({ label: "Vitória", tenths: 30, detail: "22ª Rodada" });
    expect(data.teamScores[1].get("Mirassol")!.tenths).toBe(130);
    expect(data.warnings).toEqual([]);
  });

  it("lê os palpites, as posições e confere os pontos", () => {
    const result = run();
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.data.entries).toEqual([
      { name: "Ana 1", participant: "Ana", picks: { 1: "Flamengo", 2: "Cruzeiro" }, positions: [3, undefined] },
      { name: "Ana 2", participant: "Ana", picks: { 1: "Palmeiras", 2: "Mirassol" }, positions: [1, undefined] },
      { name: "Do Zé", participant: null, picks: { 1: "Flamengo", 2: "Mirassol" }, positions: [2, undefined] },
    ]);
  });

  it("aceita ponto e vírgula, e texto sem tabulação (colunas separadas por espaços)", () => {
    expect(run({ pointsText: POINTS.replace(/\t/g, ";"), entriesText: ENTRIES.replace(/\t/g, ";") }).ok).toBe(true);
    const spaced = run({ pointsText: POINTS.replace(/\t/g, "   ") });
    if (!spaced.ok) throw new Error(spaced.errors.join("\n"));
    expect(spaced.data.teamScores[0].get("Flamengo")!.items[1]).toEqual({
      label: "Vitória fora de casa",
      tenths: 5,
      detail: "1ª Rodada",
    });
  });

  it("com uma etapa só, não precisa da linha da etapa", () => {
    const result = parseHistory({
      periodNames: ["Copa"],
      tiersText: TIERS,
      pointsText: "Flamengo\n3\tVitória\nPalmeiras\n1\tEmpate\nCruzeiro\n1\tEmpate\nMirassol\n3\tVitória",
      entriesText: "palpite\tparticipante\tN1\tN2\nA1\tAna\tFlamengo\tMirassol",
    });
    expect(result.ok).toBe(true);
  });

  it("avisa (sem bloquear) quando um time fica sem lançamento numa etapa", () => {
    const result = run({
      pointsText: POINTS.replace("Mirassol\n13\tTotal", ""),
      entriesText: ENTRIES.replace("\t24", "\t11").replace("\t17,5", "\t4,5"),
    });
    if (!result.ok) throw new Error(result.errors.join("\n"));
    expect(result.data.warnings).toEqual(["Sem nenhum lançamento em 2º turno (ficam com 0 ponto): Mirassol."]);
  });

  it("aponta os problemas da lista de pontos", () => {
    expect(errorsOf(run({ pointsText: POINTS.replace("1º turno\n", "") }))[0]).toBe(
      "Pontos: escreva o nome da etapa (1º turno ou 2º turno) numa linha antes dos times dela.",
    );
    expect(errorsOf(run({ pointsText: POINTS.replace("Cruzeiro\n3,0", "Vasco\n3,0") }))).toContain(
      'Pontos, linha 8: "Vasco" não é uma etapa nem um time dos níveis informados.',
    );
    expect(errorsOf(run({ pointsText: POINTS.replace("3,0\tVitória\t1ª Rodada", "3,25\tVitória\t1ª Rodada") }))[0]).toBe(
      'Pontos, linha 3: "3,25" não é um número de pontos (use no máximo uma casa decimal).',
    );
    expect(errorsOf(run({ pointsText: "1º turno\n3\tVitória" }))).toContain(
      "Pontos, linha 2: há um lançamento antes do nome de um time.",
    );
  });

  it("aponta os problemas dos níveis", () => {
    expect(errorsOf(run({ tiersText: "1: Flamengo, Palmeiras\n2: Cruzeiro" }))).toContain(
      "Níveis: o nível 2 tem só um time.",
    );
    expect(errorsOf(run({ tiersText: TIERS + "\n3: Flamengo, Bahia" }))).toContain(
      "Níveis, linha 3: Flamengo aparece mais de uma vez.",
    );
  });

  it("aponta pontos do palpite que não batem com a soma dos times", () => {
    expect(errorsOf(run({ entriesText: ENTRIES.replace("\t7,5\t", "\t8\t") }))).toEqual([
      "Palpites, linha 2: Ana 1 tem 8 pts na planilha (1º turno), mas os times dele somam 7,5.",
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
    expect(errorsOf(run({ entriesText: bad }))).toEqual([
      'Palpites, linha 2: "Cruzeiro" não é um time do nível 1.',
      'Palpites, linha 4: já existe outro palpite chamado "ana 2".',
      "Palpites: na etapa 1º turno, só 1 de 2 palpites têm posição. Preencha todos ou nenhum.",
    ]);
  });
});
