import { EmptyState, PageTitle } from "@/components/page-title";
import { PendingNotice, PeriodStatusChip, PeriodTabs } from "@/components/period";
import { TeamBadge } from "@/components/team-badge";
import { computeBundle, currentPeriod, getCurrentBundle } from "@/lib/data";
import { formatPoints, formatSigned, type LedgerItem } from "@/lib/scoring";
import { cn } from "@/lib/cn";
import { selectPeriod, teamMap, tiersOf } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Times" };

/** Agrupa os lançamentos por regra: "Vitória ×4 = +12". */
function summarize(items: LedgerItem[]) {
  const groups = new Map<string, { label: string; count: number; tenths: number; periodEnd: boolean }>();
  for (const item of items) {
    const key = `${item.source}:${item.ruleIndex}`;
    const g = groups.get(key) ?? { label: item.label, count: 0, tenths: 0, periodEnd: item.source === "period_end" };
    g.count++;
    g.tenths += item.tenths;
    groups.set(key, g);
  }
  return [...groups.values()];
}

export default async function TimesPage({ searchParams }: { searchParams: Promise<{ turno?: string }> }) {
  const bundle = await getCurrentBundle();
  if (!bundle) return <EmptyState title="Nenhum bolão em andamento" />;
  const result = computeBundle(bundle);
  const period = selectPeriod(result.periods, (await searchParams).turno, currentPeriod(result));
  const teams = teamMap(bundle);
  const matches = new Map(bundle.matches.map((m) => [m.id, m]));
  const projected = new Map<string, LedgerItem[]>();
  for (const item of period.projectedPeriodEnd) {
    projected.set(item.teamId, [...(projected.get(item.teamId) ?? []), item]);
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Times" subtitle="Quanto cada time já pontuou, e de onde veio cada ponto.">
        <PeriodStatusChip period={period} />
      </PageTitle>
      <PeriodTabs periods={result.periods} selected={period.period.id} basePath="/times" />
      <PendingNotice bundle={bundle} period={period} />

      {tiersOf(bundle).map((tier) => (
        <section key={tier}>
          <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Nível {tier}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {bundle.teams
              .filter((t) => t.tier === tier)
              .map((team) => {
                const score = period.teamScores[team.id];
                const summary = summarize(score.items);
                const byMatch = new Map<string, LedgerItem[]>();
                for (const item of score.items) {
                  if (item.matchId) byMatch.set(item.matchId, [...(byMatch.get(item.matchId) ?? []), item]);
                }
                const partial = projected.get(team.id) ?? [];
                return (
                  <details key={team.id} className="card group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                      <TeamBadge team={team} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{team.shortName}</span>
                        <span className="text-xs text-muted group-open:hidden">Toque para ver os detalhes</span>
                      </span>
                      <span className="text-right leading-none">
                        <span className="tabular text-xl font-extrabold">{formatPoints(score.tenths)}</span>
                        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted">pts</span>
                      </span>
                    </summary>
                    <div className="space-y-3 border-t border-border p-3 text-sm">
                      {summary.length === 0 ? (
                        <p className="text-muted">Ainda sem pontos neste turno.</p>
                      ) : (
                        <ul className="space-y-1">
                          {summary.map((g) => (
                            <li key={g.label + g.periodEnd} className="flex justify-between gap-2">
                              <span>
                                {g.label}
                                {g.count > 1 && <span className="text-muted"> ×{g.count}</span>}
                                {g.periodEnd && <span className="chip ml-1.5 bg-primary-soft text-primary">fim do turno</span>}
                              </span>
                              <span className={cn("tabular font-semibold", g.tenths < 0 && "text-danger")}>
                                {formatSigned(g.tenths)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {partial.length > 0 && (
                        <div className="rounded-xl bg-warn-soft p-2 text-xs text-warn">
                          <p className="font-semibold">Parcial: se o turno acabasse hoje</p>
                          {partial.map((item) => (
                            <p key={item.ruleIndex} className="flex justify-between">
                              <span>{item.label}</span>
                              <span className="tabular font-semibold">{formatSigned(item.tenths)}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {byMatch.size > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Jogo a jogo</p>
                          <ul className="divide-y divide-border">
                            {[...byMatch.entries()]
                              .sort((a, b) => (a[1][0].round ?? 0) - (b[1][0].round ?? 0))
                              .map(([matchId, items]) => {
                                const m = matches.get(matchId)!;
                                const total = items.reduce((sum, i) => sum + i.tenths, 0);
                                return (
                                  <li key={matchId} className="flex items-center justify-between gap-2 py-1.5">
                                    <span className="min-w-0">
                                      <span className="tabular mr-1.5 text-xs text-muted">R{m.round}</span>
                                      {teams.get(m.homeTeamId)?.code} {m.homeGoals} × {m.awayGoals}{" "}
                                      {teams.get(m.awayTeamId)?.code}
                                      <span className="block truncate text-xs text-muted">
                                        {items.map((i) => i.label).join(" + ")}
                                      </span>
                                    </span>
                                    <span className={cn("tabular font-semibold", total < 0 && "text-danger")}>
                                      {formatSigned(total)}
                                    </span>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
