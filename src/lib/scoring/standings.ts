import {
  DEFAULT_STANDINGS_CRITERIA,
  type MatchInput,
  type StandingRow,
  type StandingsCriterion,
} from "./types";

type Stats = Omit<StandingRow, "position" | "unresolvedTie">;

function emptyStats(teamId: string): Stats {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function hasResult(m: MatchInput): m is MatchInput & { homeGoals: number; awayGoals: number } {
  return m.homeGoals !== null && m.awayGoals !== null;
}

function accumulate(teamIds: string[], matches: MatchInput[]): Map<string, Stats> {
  const table = new Map<string, Stats>(teamIds.map((id) => [id, emptyStats(id)]));
  for (const m of matches) {
    if (!hasResult(m)) continue;
    const home = table.get(m.homeTeamId);
    const away = table.get(m.awayTeamId);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.goalsFor += m.homeGoals;
    home.goalsAgainst += m.awayGoals;
    away.goalsFor += m.awayGoals;
    away.goalsAgainst += m.homeGoals;
    if (m.homeGoals > m.awayGoals) {
      home.wins++;
      away.losses++;
      home.points += 3;
    } else if (m.homeGoals < m.awayGoals) {
      away.wins++;
      home.losses++;
      away.points += 3;
    } else {
      home.draws++;
      away.draws++;
      home.points++;
      away.points++;
    }
  }
  for (const s of table.values()) s.goalDifference = s.goalsFor - s.goalsAgainst;
  return table;
}

const simpleValue: Record<Exclude<StandingsCriterion, "head_to_head">, (s: Stats) => number> = {
  points: (s) => s.points,
  wins: (s) => s.wins,
  goal_difference: (s) => s.goalDifference,
  goals_for: (s) => s.goalsFor,
};

/** Divide um grupo empatado em subgrupos, do maior valor para o menor. */
function splitBy<T>(group: T[], value: (item: T) => number): T[][] {
  const sorted = [...group].sort((a, b) => value(b) - value(a));
  const out: T[][] = [];
  for (const item of sorted) {
    const last = out[out.length - 1];
    if (last && value(last[0]) === value(item)) last.push(item);
    else out.push([item]);
  }
  return out;
}

/**
 * Tabela do campeonato com os jogos informados (o chamador já filtra os jogos
 * do turno). Critérios aplicados em ordem; o confronto direto segue a CBF e só
 * vale para empate entre exatamente dois clubes. Empates que sobrarem são
 * resolvidos pela ordem manual do admin; sem ela, ficam marcados como
 * `unresolvedTie` (a ordem exibida nesse caso é apenas estável, pelo id).
 */
export function computeStandings(
  teamIds: string[],
  matches: MatchInput[],
  criteria: StandingsCriterion[] = DEFAULT_STANDINGS_CRITERIA,
  manualOrder: string[] = [],
): StandingRow[] {
  const table = accumulate(teamIds, matches);
  let groups: Stats[][] = [[...table.values()]];

  for (const criterion of criteria) {
    groups = groups.flatMap((group) => {
      if (group.length < 2) return [group];
      if (criterion === "head_to_head") {
        if (group.length !== 2) return [group];
        const ids = group.map((s) => s.teamId);
        const direct = matches.filter(
          (m) => ids.includes(m.homeTeamId) && ids.includes(m.awayTeamId),
        );
        const mini = accumulate(ids, direct);
        const byPoints = splitBy(group, (s) => mini.get(s.teamId)!.points);
        return byPoints.flatMap((g) =>
          g.length < 2 ? [g] : splitBy(g, (s) => mini.get(s.teamId)!.goalDifference),
        );
      }
      return splitBy(group, simpleValue[criterion]);
    });
  }

  const manualIndex = new Map(manualOrder.map((id, i) => [id, i]));
  const rows: StandingRow[] = [];
  for (const group of groups) {
    const resolved = splitBy(group, (s) => -(manualIndex.get(s.teamId) ?? Number.MAX_SAFE_INTEGER));
    for (const sub of resolved) {
      const ordered = [...sub].sort((a, b) => a.teamId.localeCompare(b.teamId));
      for (const s of ordered) {
        rows.push({ ...s, position: rows.length + 1, unresolvedTie: sub.length > 1 });
      }
    }
  }
  return rows;
}
