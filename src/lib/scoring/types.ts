/**
 * Tipos do motor de cálculo.
 *
 * Todos os pontos circulam em DÉCIMOS INTEIROS (ex.: 0,5 ponto = 5).
 * A conversão para texto ("12,5") acontece só na exibição (format.ts).
 */

// ---------- Configuração (JSON salvo em editions.rules) ----------

export interface PeriodConfig {
  id: string;
  name: string;
  /** [primeira rodada, última rodada], inclusive. */
  rounds: [number, number];
}

export type MatchRule =
  | { type: "win"; points: number; label?: string }
  | { type: "draw"; points: number; label?: string }
  | { type: "loss"; points: number; label?: string }
  | { type: "win_by_margin"; minMargin: number; points: number; label?: string }
  | { type: "loss_by_margin"; minMargin: number; points: number; label?: string }
  | { type: "away_win"; points: number; label?: string }
  | {
      type: "win_vs_tiers";
      teamTiers: number[];
      opponentTiers: number[];
      points: number;
      label?: string;
    };

/** Lista de posições (1 = líder) ou "lastN" (os N últimos, ex.: "last4"). */
export type PositionSpec = number[] | `last${number}`;

export type PeriodEndRule = {
  type: "standing_position";
  positions: PositionSpec;
  /** Se informado, só vale para times desses níveis. */
  teamTiers?: number[];
  points: number;
  label?: string;
};

export type Tiebreaker =
  | { type: "total_points" }
  | { type: "tier_points_sequence"; tiers: number[] };

export type PrizePosition = number | "last";

export interface PrizesConfig {
  scope: "per_period";
  positions: PrizePosition[];
  ranking: "dense";
  tieBehavior: "split";
}

export interface Rules {
  periods: PeriodConfig[];
  matchRules: MatchRule[];
  periodEndRules: PeriodEndRule[];
  tiebreakers: Tiebreaker[];
  fullTieBehavior: "share_position";
  prizes: PrizesConfig;
}

/** Critérios de desempate da tabela do campeonato (configurável por campeonato). */
export type StandingsCriterion =
  | "points"
  | "wins"
  | "goal_difference"
  | "goals_for"
  | "head_to_head";

export const DEFAULT_STANDINGS_CRITERIA: StandingsCriterion[] = [
  "points",
  "wins",
  "goal_difference",
  "goals_for",
  "head_to_head",
];

// ---------- Dados de entrada ----------

export interface TeamInput {
  id: string;
  tier: number;
}

export interface MatchInput {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  /** null enquanto o jogo não tem resultado. */
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface EntryInput {
  id: string;
  /** nível -> time escolhido */
  picks: Record<number, string>;
}

export interface EngineInput {
  rules: Rules;
  teams: TeamInput[];
  matches: MatchInput[];
  entries: EntryInput[];
  standingsCriteria?: StandingsCriterion[];
  /**
   * Ordem definida manualmente pelo admin, por turno (id do turno -> ids dos
   * times). Só é usada para desempatar times que continuam iguais depois de
   * todos os critérios automáticos (cartões, sorteio...).
   */
  manualStandingsOrder?: Record<string, string[]>;
}

// ---------- Resultado ----------

/** Um lançamento: "de onde veio cada ponto". */
export interface LedgerItem {
  teamId: string;
  periodId: string;
  source: "match" | "period_end";
  /** Preenchido quando source = "match". */
  matchId?: string;
  round?: number;
  ruleType: string;
  ruleIndex: number;
  label: string;
  /** Pontos em décimos. */
  tenths: number;
}

export interface StandingRow {
  position: number;
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** true se o time segue empatado com outro em todos os critérios e não há ordem manual. */
  unresolvedTie: boolean;
}

export interface TeamScore {
  teamId: string;
  tier: number;
  /** Total em décimos. */
  tenths: number;
  items: LedgerItem[];
}

export interface RankingRow {
  entryId: string;
  /** Posição em ranking denso (1, 2, 2, 3...). */
  position: number;
  /** Total em décimos. */
  tenths: number;
  /** Pontos (décimos) do time escolhido em cada nível. */
  tierTenths: Record<number, number>;
  /** Prêmios desta posição (ex.: [2] ou ["last"]). Vazio se não premiado. */
  prizes: PrizePosition[];
  /** Quantos palpites dividem esta posição. */
  sharedWith: number;
}

export type PeriodStatus =
  /** Nenhum jogo do turno tem resultado. */
  | "not_started"
  /** Rodadas ainda sendo disputadas. */
  | "in_progress"
  /** Só faltam jogos adiados: bônus de fim de turno e premiação aguardam. */
  | "pending"
  /** Todos os jogos têm resultado: bônus aplicados e premiação definitiva. */
  | "final";

export interface PeriodResult {
  period: PeriodConfig;
  status: PeriodStatus;
  /** Jogos sem resultado de rodadas já ultrapassadas (adiados). */
  postponedMatches: MatchInput[];
  /** Todos os jogos do turno ainda sem resultado. */
  missingMatches: MatchInput[];
  /** Maior rodada do turno com pelo menos um resultado (0 se nenhuma). */
  lastRoundWithResult: number;
  standings: StandingRow[];
  teamScores: Record<string, TeamScore>;
  ranking: RankingRow[];
  /**
   * Bônus de fim de turno que SERIAM aplicados se o turno acabasse agora.
   * Só informativo ("parcial"); vazio quando o turno já é final.
   */
  projectedPeriodEnd: LedgerItem[];
}

export interface EngineResult {
  periods: PeriodResult[];
}
