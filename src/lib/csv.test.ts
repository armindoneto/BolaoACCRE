import { describe, expect, it } from "vitest";
import { parseBrDate, parseMatchesCsv } from "./csv";

const teams = [
  { id: "fla", name: "Flamengo", shortName: "Flamengo", code: "FLA" },
  { id: "sao", name: "São Paulo", shortName: "São Paulo", code: "SAO" },
  { id: "cam", name: "Atlético Mineiro", shortName: "Atlético-MG", code: "CAM" },
];

describe("importação de jogos por CSV", () => {
  it("lê datas no horário de Brasília", () => {
    expect(parseBrDate("25/04/2026 16:00")).toBe("2026-04-25T19:00:00.000Z");
    expect(parseBrDate("2026-04-25")).toBe("2026-04-25T15:00:00.000Z");
    expect(parseBrDate("")).toBeNull();
    expect(parseBrDate("amanhã")).toBeUndefined();
  });

  it("aceita cabeçalho, nomes sem acento, siglas e placar opcional", () => {
    const { rows, errors } = parseMatchesCsv(
      "rodada;data;mandante;visitante;gm;gv\n1;25/04/2026 16:00;flamengo;SAO PAULO;2;0\n2;;Atletico-MG;FLA",
      teams,
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { round: 1, date: "2026-04-25T19:00:00.000Z", homeTeamId: "fla", awayTeamId: "sao", homeGoals: 2, awayGoals: 0 },
      { round: 2, date: null, homeTeamId: "cam", awayTeamId: "fla", homeGoals: null, awayGoals: null },
    ]);
  });

  it("aponta a linha com problema", () => {
    const { rows, errors } = parseMatchesCsv("1,,Flamengo,Vasco\n2,,Flamengo,Flamengo\n3,,Flamengo,São Paulo,1,", teams);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([
      'Linha 1: time não encontrado "Vasco".',
      "Linha 2: mandante e visitante são o mesmo time.",
      "Linha 3: placar incompleto ou inválido.",
    ]);
  });

  it("aceita o formato sem data: rodada, mandante e visitante", () => {
    const { rows, errors } = parseMatchesCsv(
      ["1\tSão Paulo\tFlamengo", "1\tAtlético-MG\tsao paulo\t2\t1", "2\tFLA\tCAM\t\t", "3,Flamengo,São Paulo"].join("\n"),
      teams,
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { round: 1, date: null, homeTeamId: "sao", awayTeamId: "fla", homeGoals: null, awayGoals: null },
      { round: 1, date: null, homeTeamId: "cam", awayTeamId: "sao", homeGoals: 2, awayGoals: 1 },
      { round: 2, date: null, homeTeamId: "fla", awayTeamId: "cam", homeGoals: null, awayGoals: null },
      { round: 3, date: null, homeTeamId: "fla", awayTeamId: "sao", homeGoals: null, awayGoals: null },
    ]);
  });

  it("aponta linha sem visitante e data inválida", () => {
    const { errors } = parseMatchesCsv("1\tFlamengo\n2;32/13/2026;Flamengo;São Paulo", teams);
    expect(errors).toEqual([
      "Linha 1: faltam colunas (rodada, mandante e visitante).",
      'Linha 2: data inválida "32/13/2026" (use dd/mm/aaaa hh:mm).',
    ]);
  });
});
