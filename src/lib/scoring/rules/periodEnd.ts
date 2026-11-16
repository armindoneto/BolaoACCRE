import type { PeriodEndRule, PositionSpec, StandingRow } from "../types";
import { ofTiers } from "./match";

/** Resolve a lista de posições (1 = líder) para uma tabela com `teamCount` times. */
export function resolvePositions(spec: PositionSpec, teamCount: number): number[] {
  if (Array.isArray(spec)) return spec;
  const m = /^last(\d+)$/.exec(spec);
  if (!m) throw new Error(`Posições inválidas: ${spec}`);
  const n = Math.min(Number(m[1]), teamCount);
  return Array.from({ length: n }, (_, i) => teamCount - n + 1 + i);
}

/**
 * Tipo "standing_position": times que terminam o turno em certas posições da
 * tabela (opcionalmente só de certos níveis). Devolve os ids dos times.
 */
export function periodEndRuleTeams(
  rule: PeriodEndRule,
  standings: StandingRow[],
  tierOf: (teamId: string) => number | undefined,
): string[] {
  if (rule.type !== "standing_position") {
    throw new Error(`Tipo de regra de fim de turno desconhecido: ${(rule as { type: string }).type}`);
  }
  const positions = resolvePositions(rule.positions, standings.length);
  return standings
    .filter((row) => positions.includes(row.position))
    .filter((row) => {
      if (!rule.teamTiers) return true;
      const tier = tierOf(row.teamId);
      return tier !== undefined && rule.teamTiers.includes(tier);
    })
    .map((row) => row.teamId);
}

function positionsText(spec: PositionSpec): string {
  if (!Array.isArray(spec)) {
    const n = Number(spec.replace("last", ""));
    return n === 1 ? "em último lugar" : `entre os ${n} últimos`;
  }
  if (spec.length === 1) return `em ${spec[0]}º lugar`;
  const sorted = [...spec].sort((a, b) => a - b);
  const contiguousFromTop = sorted.every((p, i) => p === i + 1);
  if (contiguousFromTop) return `entre os ${sorted.length} primeiros`;
  return `nas posições ${sorted.map((p) => `${p}º`).join(", ")}`;
}

export function periodEndRuleLabel(rule: PeriodEndRule): string {
  return rule.label ?? describePeriodEndRule(rule);
}

export function describePeriodEndRule(rule: PeriodEndRule): string {
  const who = rule.teamTiers ? `Time ${ofTiers(rule.teamTiers)}` : "Time";
  const base = `${who} ${positionsText(rule.positions)} no fim do turno`;
  return rule.label ? `${rule.label} (${base.charAt(0).toLowerCase()}${base.slice(1)})` : base;
}
