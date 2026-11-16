import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/page-title";
import { PendingNotice, PeriodStatusChip, PeriodTabs, UnresolvedTieNotice } from "@/components/period";
import { TeamBadge } from "@/components/team-badge";
import { computeBundle, currentPeriod, getCurrentBundle } from "@/lib/data";
import { resolvePositions } from "@/lib/scoring/rules/periodEnd";
import { cn } from "@/lib/cn";
import { dateFmt, selectPeriod, teamMap } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campeonato" };

export default async function CampeonatoPage({
  searchParams,
}: {
  searchParams: Promise<{ turno?: string; rodada?: string }>;
}) {
  const bundle = await getCurrentBundle();
  if (!bundle) return <EmptyState title="Nenhum bolão em andamento" />;
  const params = await searchParams;
  const result = computeBundle(bundle);
  const period = selectPeriod(result.periods, params.turno, currentPeriod(result));
  const teams = teamMap(bundle);
  const [first, last] = period.period.rounds;

  // Faixas da tabela que valem pontos no fim do turno (definidas pelas regras).
  const zone = new Map<number, "up" | "down">();
  for (const rule of bundle.edition.rules.periodEndRules) {
    if (rule.teamTiers) continue;
    for (const pos of resolvePositions(rule.positions, period.standings.length)) {
      zone.set(pos, rule.points >= 0 ? "up" : "down");
    }
  }

  const requested = Number(params.rodada);
  const round =
    requested >= first && requested <= last
      ? requested
      : Math.min(Math.max(period.lastRoundWithResult || first, first), last);
  const roundMatches = bundle.matches.filter((m) => m.round === round);
  const roundLink = (r: number) => `/campeonato?turno=${period.period.id}&rodada=${r}#rodada`;

  return (
    <div className="space-y-4">
      <PageTitle title="Campeonato" subtitle={`${bundle.edition.competitionName} · tabela só com os jogos do turno`}>
        <PeriodStatusChip period={period} />
      </PageTitle>
      <PeriodTabs periods={result.periods} selected={period.period.id} basePath="/campeonato" />
      <PendingNotice bundle={bundle} period={period} />
      <UnresolvedTieNotice period={period} />

      <section className="card overflow-hidden">
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="w-9 py-2 pl-3 text-left font-medium">#</th>
              <th className="py-2 text-left font-medium">Time</th>
              <th className="w-8 py-2 font-bold text-fg" title="Pontos">P</th>
              <th className="w-7 py-2 font-medium" title="Jogos">J</th>
              <th className="w-7 py-2 font-medium" title="Vitórias">V</th>
              <th className="w-7 py-2 font-medium" title="Empates">E</th>
              <th className="w-7 py-2 font-medium" title="Derrotas">D</th>
              <th className="hidden w-8 py-2 font-medium sm:table-cell" title="Gols pró">GP</th>
              <th className="hidden w-8 py-2 font-medium sm:table-cell" title="Gols contra">GC</th>
              <th className="w-9 py-2 pr-3 font-medium" title="Saldo de gols">SG</th>
            </tr>
          </thead>
          <tbody>
            {period.standings.map((row) => {
              const team = teams.get(row.teamId)!;
              const z = zone.get(row.position);
              return (
                <tr key={row.teamId} className="border-b border-border/60 text-center last:border-0">
                  <td
                    className={cn(
                      "border-l-4 border-transparent py-1.5 pl-2 text-left font-semibold",
                      z === "up" && "border-primary",
                      z === "down" && "border-danger",
                    )}
                  >
                    {row.position}
                  </td>
                  <td className="py-1.5 text-left">
                    <span className="flex items-center gap-2">
                      <TeamBadge team={team} size={22} />
                      <span className="truncate font-medium">{team.shortName}</span>
                      <span className="text-[10px] text-muted">N{team.tier}</span>
                    </span>
                  </td>
                  <td className="font-bold">{row.points}</td>
                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.draws}</td>
                  <td>{row.losses}</td>
                  <td className="hidden sm:table-cell">{row.goalsFor}</td>
                  <td className="hidden sm:table-cell">{row.goalsAgainst}</td>
                  <td className="pr-3">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-xs text-muted">
          <span><span className="mr-1 inline-block size-2 rounded-full bg-primary" />Ganha pontos no fim do turno</span>
          <span><span className="mr-1 inline-block size-2 rounded-full bg-danger" />Perde pontos no fim do turno</span>
          <span>N = nível no bolão</span>
        </p>
      </section>

      <section id="rodada" className="card scroll-mt-20">
        <div className="flex items-center justify-between border-b border-border p-2">
          {round > first ? (
            <Link href={roundLink(round - 1)} scroll={false} aria-label="Rodada anterior" className="btn-outline size-11 px-0">
              <ChevronLeft className="size-5" />
            </Link>
          ) : (
            <span className="size-11" />
          )}
          <h2 className="font-bold">Rodada {round}</h2>
          {round < last ? (
            <Link href={roundLink(round + 1)} scroll={false} aria-label="Próxima rodada" className="btn-outline size-11 px-0">
              <ChevronRight className="size-5" />
            </Link>
          ) : (
            <span className="size-11" />
          )}
        </div>
        {roundMatches.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Os jogos desta rodada ainda não foram cadastrados.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {roundMatches.map((m) => {
              const home = teams.get(m.homeTeamId)!;
              const away = teams.get(m.awayTeamId)!;
              const played = m.homeGoals !== null;
              const postponed = period.postponedMatches.some((p) => p.id === m.id);
              return (
                <li key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 text-sm">
                  <span className="flex items-center justify-end gap-2 text-right">
                    <span className="truncate font-medium">{home.shortName}</span>
                    <TeamBadge team={home} size={24} />
                  </span>
                  <span className="tabular min-w-16 text-center">
                    {played ? (
                      <span className="text-base font-extrabold">{m.homeGoals} × {m.awayGoals}</span>
                    ) : postponed ? (
                      <span className="chip bg-warn-soft text-warn">adiado</span>
                    ) : (
                      <span className="text-xs text-muted">{m.date ? dateFmt.format(new Date(m.date)) : "×"}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <TeamBadge team={away} size={24} />
                    <span className="truncate font-medium">{away.shortName}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
