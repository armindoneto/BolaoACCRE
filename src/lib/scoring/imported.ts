import { rankEntries } from "./ranking";
import type {
  EngineResult,
  EntryInput,
  ImportedResults,
  LedgerItem,
  PeriodResult,
  PrizesConfig,
  RankingRow,
  Rules,
  TeamInput,
  TeamScore,
} from "./types";

/**
 * Monta o resultado de uma edição ANTIGA a partir dos números importados da
 * planilha. Nada é recalculado por jogo: os pontos de cada time vêm prontos.
 * O total de cada palpite continua sendo a soma dos seus times. Toda etapa de
 * uma edição importada é final.
 */
export function buildImportedResult(input: {
  rules: Rules;
  teams: TeamInput[];
  entries: EntryInput[];
  imported: ImportedResults;
}): EngineResult {
  const { rules, teams, entries, imported } = input;
  return {
    periods: rules.periods.map((period): PeriodResult => {
      const data = imported.periods.find((p) => p.id === period.id);
      const teamScores: Record<string, TeamScore> = {};
      for (const team of teams) {
        const score = data?.teamScores[team.id];
        const items: LedgerItem[] = (score?.items ?? []).map((item, ruleIndex) => ({
          teamId: team.id,
          periodId: period.id,
          source: "imported",
          ruleType: "imported",
          ruleIndex,
          label: item.label,
          tenths: item.tenths,
          detail: item.detail,
        }));
        teamScores[team.id] = { teamId: team.id, tier: team.tier, tenths: score?.tenths ?? 0, items };
      }
      let ranking = rankEntries(entries, teamScores, rules.tiebreakers, rules.prizes);
      if (data?.positions) ranking = applyPositions(ranking, data.positions, rules.prizes);
      return {
        period,
        status: "final",
        postponedMatches: [],
        missingMatches: [],
        lastRoundWithResult: 0,
        standings: [],
        teamScores,
        ranking,
        projectedPeriodEnd: [],
      };
    }),
  };
}

/**
 * Usa as posições que vieram da planilha no lugar das calculadas (as regras de
 * desempate daquele ano podem ter sido outras). As posições são renumeradas em
 * ranking denso, e os prêmios seguem a configuração da edição.
 */
export function applyPositions(
  ranking: RankingRow[],
  positions: Record<string, number>,
  prizes: PrizesConfig,
): RankingRow[] {
  const order = new Map(ranking.map((row, i) => [row.entryId, i]));
  const given = (row: RankingRow) => positions[row.entryId] ?? Number.MAX_SAFE_INTEGER;
  const sorted = [...ranking].sort((a, b) => given(a) - given(b) || order.get(a.entryId)! - order.get(b.entryId)!);

  const rows: RankingRow[] = [];
  let position = 0;
  let previous: number | null = null;
  for (const row of sorted) {
    // Quem não veio com posição fica em posições próprias, no fim.
    const value = positions[row.entryId];
    if (previous === null || value === undefined || value !== previous) position++;
    previous = value ?? null;
    rows.push({ ...row, position, prizes: [], sharedWith: 1 });
  }
  const lastPosition = position;
  const size = new Map<number, number>();
  for (const row of rows) size.set(row.position, (size.get(row.position) ?? 0) + 1);
  for (const row of rows) {
    row.sharedWith = size.get(row.position)!;
    for (const prize of prizes.positions) {
      if (prize !== "last" && prize === row.position) row.prizes.push(prize);
    }
    if (prizes.positions.includes("last") && row.position === lastPosition && row.prizes.length === 0) {
      row.prizes.push("last");
    }
  }
  return rows;
}
