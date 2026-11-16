import type { EntryInput, PrizesConfig, RankingRow, TeamScore, Tiebreaker } from "./types";

/**
 * Classifica os palpites. Cada critério de desempate vira uma parte de um
 * vetor de comparação; palpites com vetores iguais dividem a posição.
 * As posições usam ranking denso: 1º, 2º, 2º, 2º, 3º...
 */
export function rankEntries(
  entries: EntryInput[],
  teamScores: Record<string, TeamScore>,
  tiebreakers: Tiebreaker[],
  prizes: PrizesConfig,
): RankingRow[] {
  const scored = entries.map((entry) => {
    const tierTenths: Record<number, number> = {};
    let tenths = 0;
    for (const [tier, teamId] of Object.entries(entry.picks)) {
      const value = teamScores[teamId]?.tenths ?? 0;
      tierTenths[Number(tier)] = value;
      tenths += value;
    }
    const vector: number[] = [];
    for (const tb of tiebreakers) {
      if (tb.type === "total_points") vector.push(tenths);
      else if (tb.type === "tier_points_sequence") {
        for (const tier of tb.tiers) vector.push(tierTenths[tier] ?? 0);
      } else {
        throw new Error(`Critério de desempate desconhecido: ${(tb as { type: string }).type}`);
      }
    }
    return { entry, tenths, tierTenths, vector };
  });

  const compare = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return b[i] - a[i];
    }
    return 0;
  };
  scored.sort((a, b) => compare(a.vector, b.vector) || a.entry.id.localeCompare(b.entry.id));

  const rows: RankingRow[] = [];
  let position = 0;
  let previous: number[] | null = null;
  for (const s of scored) {
    if (!previous || compare(previous, s.vector) !== 0) position++;
    previous = s.vector;
    rows.push({
      entryId: s.entry.id,
      position,
      tenths: s.tenths,
      tierTenths: s.tierTenths,
      prizes: [],
      sharedWith: 1,
    });
  }

  const lastPosition = position;
  const groupSize = new Map<number, number>();
  for (const row of rows) groupSize.set(row.position, (groupSize.get(row.position) ?? 0) + 1);

  for (const row of rows) {
    row.sharedWith = groupSize.get(row.position)!;
    for (const prize of prizes.positions) {
      if (prize !== "last" && prize === row.position) row.prizes.push(prize);
    }
    // O prêmio de último vai para o último grupo, desde que ele já não esteja
    // numa posição premiada (acontece só com pouquíssimos palpites).
    if (
      prizes.positions.includes("last") &&
      row.position === lastPosition &&
      row.prizes.length === 0
    ) {
      row.prizes.push("last");
    }
  }
  return rows;
}
