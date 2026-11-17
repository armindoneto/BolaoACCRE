import { formatPoints, type PeriodResult, type PrizePosition } from "@/lib/scoring";
import type { BadgeTeam } from "@/components/team-badge";
import type { EditionBundle, EditionTeam } from "@/lib/data";

/** Linha da classificação pronta para exibir (serializável para componentes de cliente). */
export interface RankingViewRow {
  entryId: string;
  /** null enquanto o palpite não foi atribuído a um participante. */
  participantId: string | null;
  participantName: string | null;
  position: number;
  /** Nome do palpite. */
  name: string;
  points: string;
  prizes: PrizePosition[];
  sharedWith: number;
  teams: (BadgeTeam & { tier: number; points: string })[];
}

export function teamMap(bundle: EditionBundle): Map<string, EditionTeam> {
  return new Map(bundle.teams.map((t) => [t.id, t]));
}

export function tiersOf(bundle: EditionBundle): number[] {
  return [...new Set(bundle.teams.map((t) => t.tier))].sort((a, b) => a - b);
}

export function toBadge(team: EditionTeam): BadgeTeam {
  return { name: team.name, code: team.code, crestUrl: team.crestUrl, color: team.color, color2: team.color2 };
}

export function buildRankingRows(bundle: EditionBundle, period: PeriodResult): RankingViewRow[] {
  const teams = teamMap(bundle);
  const entries = new Map(bundle.entries.map((e) => [e.id, e]));
  const tiers = tiersOf(bundle);
  return period.ranking.flatMap((row) => {
    const entry = entries.get(row.entryId);
    if (!entry) return [];
    return [
      {
        entryId: row.entryId,
        participantId: entry.participantId,
        participantName: entry.participantName,
        position: row.position,
        name: entry.name,
        points: formatPoints(row.tenths),
        prizes: row.prizes,
        sharedWith: row.sharedWith,
        teams: tiers.flatMap((tier) => {
          const team = teams.get(entry.picks[tier]);
          return team
            ? [{ ...toBadge(team), tier, points: formatPoints(row.tierTenths[tier] ?? 0) }]
            : [];
        }),
      },
    ];
  });
}

export function matchLabel(
  bundle: EditionBundle,
  match: { homeTeamId: string; awayTeamId: string },
): string {
  const teams = teamMap(bundle);
  return `${teams.get(match.homeTeamId)?.shortName ?? "?"} × ${teams.get(match.awayTeamId)?.shortName ?? "?"}`;
}

/** Lê ?turno= e devolve o turno pedido, ou o padrão. */
export function selectPeriod(
  periods: PeriodResult[],
  requested: string | string[] | undefined,
  fallback: PeriodResult,
): PeriodResult {
  const id = Array.isArray(requested) ? requested[0] : requested;
  return periods.find((p) => p.period.id === id) ?? fallback;
}

export const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
