import type { Rules } from "./types";

/** Regras do Brasileirão 2026 (mesmo JSON do seed). Usado no modo demonstração e nos testes. */
export const RULES_2026: Rules = {
  periods: [
    { id: "T1", name: "1º turno", rounds: [1, 19] },
    { id: "T2", name: "2º turno", rounds: [20, 38] },
  ],
  matchRules: [
    { type: "win", points: 3 },
    { type: "draw", points: 1 },
    { type: "win_by_margin", minMargin: 3, points: 2 },
    { type: "away_win", points: 0.5 },
    { type: "win_vs_tiers", teamTiers: [9, 10], opponentTiers: [1, 2], points: 1 },
    { type: "loss_by_margin", minMargin: 3, points: -2 },
  ],
  periodEndRules: [
    { type: "standing_position", positions: [1], points: 3, label: "Campeão do turno" },
    { type: "standing_position", positions: [2], points: 1, label: "Vice do turno" },
    { type: "standing_position", positions: [1, 2, 3, 4], teamTiers: [9, 10], points: 2, label: "Nível 9/10 no G4" },
    { type: "standing_position", positions: "last4", points: -3, label: "Rebaixado no turno" },
  ],
  tiebreakers: [
    { type: "total_points" },
    { type: "tier_points_sequence", tiers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  ],
  fullTieBehavior: "share_position",
  prizes: { scope: "per_period", positions: [1, 2, 3, "last"], ranking: "dense", tieBehavior: "split" },
};
