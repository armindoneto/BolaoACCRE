import { describe, expect, it } from "vitest";
import { parseEntriesImport } from "./parse";

const teams = [
  { id: "fla", name: "Flamengo", shortName: "Flamengo", code: "FLA", tier: 1 },
  { id: "pal", name: "Palmeiras", shortName: "Palmeiras", code: "PAL", tier: 1 },
  { id: "rbb", name: "Red Bull Bragantino", shortName: "Bragantino", code: "RBB", tier: 2 },
  { id: "vas", name: "Vasco da Gama", shortName: "Vasco", code: "VAS", tier: 2 },
];

describe("importação de palpites", () => {
  it("lê palpites com tabulação, cabeçalho, nomes curtos e participante vazio", () => {
    const { rows, errors } = parseEntriesImport({
      text: "aposta\tparticipante\tN1\tN2\nJoão 1\tJoão Silva\tflamengo\tBragantino\t\nZé da sorte\t\tPAL\tVasco",
      teams,
      existingNames: [],
    });
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { line: 2, name: "João 1", participant: "João Silva", picks: { 1: "fla", 2: "rbb" } },
      { line: 3, name: "Zé da sorte", participant: null, picks: { 1: "pal", 2: "vas" } },
    ]);
  });

  it("aceita ponto e vírgula e vírgula", () => {
    const { rows, errors } = parseEntriesImport({
      text: "A1;Ana;Flamengo;Vasco\nB1,Bia,Palmeiras,Vasco",
      teams,
      existingNames: [],
    });
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
  });

  it("aponta colunas a menos, time errado, nível errado e nome repetido", () => {
    const { rows, errors } = parseEntriesImport({
      text: ["A1\tAna\tFlamengo", "A2\tAna\tCorinthians\tVasco", "A3\tAna\tVasco\tFlamengo", "a4\tAna\tFlamengo\tVasco", "A4\tAna\tPalmeiras\tVasco", "Já existe\t\tFlamengo\tVasco"].join("\n"),
      teams,
      existingNames: ["já existe"],
    });
    expect(errors).toEqual([
      "Linha 1: são 3 colunas, mas o esperado é 4 (palpite, participante e um time para cada um dos 2 níveis).",
      'Linha 2: time não encontrado "Corinthians" (nível 1).',
      "Linha 3: Vasco da Gama não é do nível 1 (é do nível 2).",
      "Linha 3: Flamengo não é do nível 2 (é do nível 1).",
      'Linha 5: já existe um palpite chamado "A4".',
      'Linha 6: já existe um palpite chamado "Já existe".',
    ]);
    expect(rows.map((r) => r.name)).toEqual(["a4"]);
  });
});
