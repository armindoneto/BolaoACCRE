import { toTenths } from "./format";
import { rankEntries } from "./ranking";
import { matchRuleApplies, matchRuleLabel, type MatchSide } from "./rules/match";
import { periodEndRuleLabel, periodEndRuleTeams } from "./rules/periodEnd";
import { computeStandings } from "./standings";
import type {
  EngineInput,
  EngineResult,
  LedgerItem,
  MatchInput,
  PeriodConfig,
  PeriodResult,
  PeriodStatus,
  StandingRow,
  TeamScore,
} from "./types";

function hasResult(m: MatchInput): boolean {
  return m.homeGoals !== null && m.awayGoals !== null;
}

/**
 * Calcula a edição inteira. Função pura: não acessa banco nem rede.
 * Cada turno é calculado de forma isolada, só com os jogos das suas rodadas
 * (o turno de um jogo é definido pela RODADA, não pela data).
 */
export function computeEdition(input: EngineInput): EngineResult {
  const highestRoundWithResult = input.matches
    .filter(hasResult)
    .reduce((max, m) => Math.max(max, m.round), 0);

  return {
    periods: input.rules.periods.map((period) =>
      computePeriod(input, period, highestRoundWithResult),
    ),
  };
}

function computePeriod(
  input: EngineInput,
  period: PeriodConfig,
  highestRoundWithResult: number,
): PeriodResult {
  const { rules, teams } = input;
  const tierById = new Map(teams.map((t) => [t.id, t.tier]));
  const tierOf = (id: string) => tierById.get(id);
  const [firstRound, lastRound] = period.rounds;

  const periodMatches = input.matches.filter(
    (m) => m.round >= firstRound && m.round <= lastRound,
  );
  const played = periodMatches.filter(hasResult);
  const missingMatches = periodMatches.filter((m) => !hasResult(m));
  // Adiado = sem resultado, mas alguma rodada posterior já tem resultado.
  const postponedMatches = missingMatches.filter((m) => m.round < highestRoundWithResult);

  // ---- Lançamentos por jogo ----
  const items: LedgerItem[] = [];
  for (const m of played) {
    const sides: { teamId: string; side: MatchSide }[] = [
      {
        teamId: m.homeTeamId,
        side: {
          isHome: true,
          goalsFor: m.homeGoals!,
          goalsAgainst: m.awayGoals!,
          teamTier: tierOf(m.homeTeamId),
          opponentTier: tierOf(m.awayTeamId),
        },
      },
      {
        teamId: m.awayTeamId,
        side: {
          isHome: false,
          goalsFor: m.awayGoals!,
          goalsAgainst: m.homeGoals!,
          teamTier: tierOf(m.awayTeamId),
          opponentTier: tierOf(m.homeTeamId),
        },
      },
    ];
    for (const { teamId, side } of sides) {
      rules.matchRules.forEach((rule, ruleIndex) => {
        if (!matchRuleApplies(rule, side)) return;
        items.push({
          teamId,
          periodId: period.id,
          source: "match",
          matchId: m.id,
          round: m.round,
          ruleType: rule.type,
          ruleIndex,
          label: matchRuleLabel(rule),
          tenths: toTenths(rule.points),
        });
      });
    }
  }

  // ---- Status do turno ----
  const roundsWithFixtures = new Set(periodMatches.map((m) => m.round));
  let allRoundsRegistered = true;
  for (let r = firstRound; r <= lastRound; r++) {
    if (!roundsWithFixtures.has(r)) allRoundsRegistered = false;
  }
  let status: PeriodStatus;
  if (played.length === 0) status = "not_started";
  else if (missingMatches.length === 0 && allRoundsRegistered) status = "final";
  else if (
    allRoundsRegistered &&
    missingMatches.length > 0 &&
    postponedMatches.length === missingMatches.length
  )
    status = "pending";
  else status = "in_progress";

  // ---- Tabela do turno e bônus de fim de turno ----
  const standings = computeStandings(
    teams.map((t) => t.id),
    played,
    input.standingsCriteria,
    input.manualStandingsOrder?.[period.id],
  );
  const periodEndItems = played.length > 0 ? periodEndLedger(input, period, standings, tierOf) : [];
  if (status === "final") items.push(...periodEndItems);

  // ---- Soma por time, depois por palpite ----
  const teamScores: Record<string, TeamScore> = {};
  for (const t of teams) teamScores[t.id] = { teamId: t.id, tier: t.tier, tenths: 0, items: [] };
  for (const item of items) {
    const score = teamScores[item.teamId];
    if (!score) continue;
    score.items.push(item);
    score.tenths += item.tenths;
  }

  return {
    period,
    status,
    postponedMatches,
    missingMatches,
    lastRoundWithResult: played.reduce((max, m) => Math.max(max, m.round), 0),
    standings,
    teamScores,
    ranking: rankEntries(input.entries, teamScores, rules.tiebreakers, rules.prizes),
    projectedPeriodEnd: status === "final" ? [] : periodEndItems,
  };
}

function periodEndLedger(
  input: EngineInput,
  period: PeriodConfig,
  standings: StandingRow[],
  tierOf: (id: string) => number | undefined,
): LedgerItem[] {
  const items: LedgerItem[] = [];
  input.rules.periodEndRules.forEach((rule, ruleIndex) => {
    for (const teamId of periodEndRuleTeams(rule, standings, tierOf)) {
      items.push({
        teamId,
        periodId: period.id,
        source: "period_end",
        ruleType: rule.type,
        ruleIndex,
        label: periodEndRuleLabel(rule),
        tenths: toTenths(rule.points),
      });
    }
  });
  return items;
}

/**
 * Chave canônica de um palpite: ids dos times ordenados por nível, unidos por
 * "|". Palpites idênticos têm a mesma chave.
 */
export function selectionKey(picks: Record<number, string>): string {
  return Object.keys(picks)
    .map(Number)
    .sort((a, b) => a - b)
    .map((tier) => picks[tier])
    .join("|");
}
