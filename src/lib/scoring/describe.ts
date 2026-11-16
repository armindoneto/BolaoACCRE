import { formatSigned, toTenths } from "./format";
import { describeMatchRule } from "./rules/match";
import { describePeriodEndRule } from "./rules/periodEnd";
import type { PrizePosition, Rules } from "./types";

export interface RulesDescription {
  periods: string[];
  matchRules: { text: string; points: string }[];
  periodEndRules: { text: string; points: string }[];
  tiebreakers: string[];
  prizes: string[];
}

export function prizeName(prize: PrizePosition): string {
  return prize === "last" ? "Último colocado" : `${prize}º lugar`;
}

/** Transforma o JSON de regras em frases simples para a página /regras. */
export function describeRules(rules: Rules): RulesDescription {
  const tiebreakers: string[] = [];
  for (const tb of rules.tiebreakers) {
    if (tb.type === "total_points") tiebreakers.push("Maior total de pontos.");
    else {
      const [first, ...rest] = tb.tiers;
      tiebreakers.push(
        rest.length === 0
          ? `Maior pontuação do time do nível ${first}.`
          : `Maior pontuação do time do nível ${first}. Se continuar empatado, do nível ${rest[0]}, e assim por diante até o nível ${rest[rest.length - 1]}.`,
      );
    }
  }
  tiebreakers.push(
    "Se ainda houver empate (inclusive palpites idênticos), os palpites dividem a posição e o prêmio.",
  );

  const prizeList = rules.prizes.positions.map(prizeName);
  const prizes = [
    `Em cada turno são premiados: ${prizeList.join(", ")}.`,
    "Empatados numa posição premiada dividem aquele prêmio, e o grupo logo abaixo leva o prêmio seguinte.",
  ];

  return {
    periods: rules.periods.map(
      (p) => `${p.name}: rodadas ${p.rounds[0]} a ${p.rounds[1]}`,
    ),
    matchRules: rules.matchRules.map((r) => ({
      text: describeMatchRule(r),
      points: formatSigned(toTenths(r.points)),
    })),
    periodEndRules: rules.periodEndRules.map((r) => ({
      text: describePeriodEndRule(r),
      points: formatSigned(toTenths(r.points)),
    })),
    tiebreakers,
    prizes,
  };
}
