import type { MatchRule } from "../types";

/** Visão de um jogo do ponto de vista de um dos times. */
export interface MatchSide {
  isHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
  teamTier: number | undefined;
  opponentTier: number | undefined;
}

type Evaluator<T extends MatchRule["type"]> = (
  rule: Extract<MatchRule, { type: T }>,
  side: MatchSide,
) => boolean;

/**
 * Catálogo de tipos de regra por jogo. Cada função é pura e diz apenas se a
 * regra se aplica ao time naquele jogo; os pontos vêm da configuração.
 */
const evaluators: { [T in MatchRule["type"]]: Evaluator<T> } = {
  win: (_r, s) => s.goalsFor > s.goalsAgainst,
  draw: (_r, s) => s.goalsFor === s.goalsAgainst,
  loss: (_r, s) => s.goalsFor < s.goalsAgainst,
  win_by_margin: (r, s) => s.goalsFor - s.goalsAgainst >= r.minMargin,
  loss_by_margin: (r, s) => s.goalsAgainst - s.goalsFor >= r.minMargin,
  away_win: (_r, s) => !s.isHome && s.goalsFor > s.goalsAgainst,
  win_vs_tiers: (r, s) =>
    s.goalsFor > s.goalsAgainst &&
    s.teamTier !== undefined &&
    s.opponentTier !== undefined &&
    r.teamTiers.includes(s.teamTier) &&
    r.opponentTiers.includes(s.opponentTier),
};

export function matchRuleApplies(rule: MatchRule, side: MatchSide): boolean {
  const fn = evaluators[rule.type] as Evaluator<MatchRule["type"]> | undefined;
  if (!fn) throw new Error(`Tipo de regra de jogo desconhecido: ${rule.type}`);
  return fn(rule as never, side);
}

export const MATCH_RULE_TYPES = Object.keys(evaluators) as MatchRule["type"][];

function tiersText(tiers: number[]): string {
  if (tiers.length === 1) return `nível ${tiers[0]}`;
  return `níveis ${tiers.slice(0, -1).join(", ")} ou ${tiers[tiers.length - 1]}`;
}

/** Nome curto usado nos lançamentos ("de onde veio cada ponto"). */
export function matchRuleLabel(rule: MatchRule): string {
  if (rule.label) return rule.label;
  switch (rule.type) {
    case "win":
      return "Vitória";
    case "draw":
      return "Empate";
    case "loss":
      return "Derrota";
    case "win_by_margin":
      return "Vitória por goleada";
    case "loss_by_margin":
      return "Derrota por goleada";
    case "away_win":
      return "Vitória fora de casa";
    case "win_vs_tiers":
      return `Vitória sobre time ${ofTiers(rule.opponentTiers)}`;
  }
}

/** Frase completa para a página de regras. */
export function describeMatchRule(rule: MatchRule): string {
  switch (rule.type) {
    case "win":
      return "Vitória";
    case "draw":
      return "Empate";
    case "loss":
      return "Derrota";
    case "win_by_margin":
      return `Vitória por goleada (${rule.minMargin} ou mais gols de diferença)`;
    case "loss_by_margin":
      return `Derrota por goleada (${rule.minMargin} ou mais gols de diferença)`;
    case "away_win":
      return "Vitória fora de casa";
    case "win_vs_tiers":
      return `Vitória de time ${ofTiers(rule.teamTiers)} sobre time ${ofTiers(rule.opponentTiers)}`;
  }
}

/** "do nível 9" / "dos níveis 9 ou 10". */
export function ofTiers(tiers: number[]): string {
  return `${tiers.length === 1 ? "do" : "dos"} ${tiersText(tiers)}`;
}

export { tiersText };
