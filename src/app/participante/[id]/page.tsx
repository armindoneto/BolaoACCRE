import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/page-title";
import { PendingNotice, PeriodTabs } from "@/components/period";
import { prizeStyle } from "@/lib/prize-style";
import { TeamBadge } from "@/components/team-badge";
import { computeBundle, currentPeriod, getCurrentBundle } from "@/lib/data";
import { formatPoints } from "@/lib/scoring";
import { cn } from "@/lib/cn";
import { selectPeriod, teamMap, tiersOf } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function ParticipantePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ turno?: string }>;
}) {
  const { id } = await params;
  const bundle = await getCurrentBundle();
  const entries = bundle?.entries.filter((e) => e.participantId === id) ?? [];
  if (!bundle || entries.length === 0 || bundle.edition.status === "open_for_entries") notFound();

  const result = computeBundle(bundle);
  const period = selectPeriod(result.periods, (await searchParams).turno, currentPeriod(result));
  const teams = teamMap(bundle);
  const tiers = tiersOf(bundle);
  const [first, last] = period.period.rounds;
  const lastRound = Math.max(period.lastRoundWithResult, first - 1);
  const rounds = Array.from({ length: Math.max(lastRound - first + 1, 0) }, (_, i) => first + i);

  return (
    <div className="space-y-4">
      <Link href={`/?turno=${period.period.id}`} className="no-print inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ChevronLeft className="size-4" /> Classificação
      </Link>
      <PageTitle
        title={entries[0].participantName}
        subtitle={`${entries.length} ${entries.length === 1 ? "palpite" : "palpites"} · ${bundle.edition.name}`}
      />
      <PeriodTabs periods={result.periods} selected={period.period.id} basePath={`/participante/${id}`} />
      <PendingNotice bundle={bundle} period={period} />

      {entries.map((entry, index) => {
        const row = period.ranking.find((r) => r.entryId === entry.id)!;
        const style = prizeStyle(row.prizes[0]);
        // Pontos por rodada (soma dos times do palpite) e bônus de fim de turno.
        const perRound = new Map<number, number>();
        let periodEnd = 0;
        for (const tier of tiers) {
          for (const item of period.teamScores[entry.picks[tier]]?.items ?? []) {
            if (item.round !== undefined) perRound.set(item.round, (perRound.get(item.round) ?? 0) + item.tenths);
            else periodEnd += item.tenths;
          }
        }
        const maxAbs = Math.max(10, ...rounds.map((r) => Math.abs(perRound.get(r) ?? 0)));

        return (
          <section key={entry.id} className={cn("card overflow-hidden", style?.row)}>
            <div className="flex items-center gap-3 p-4">
              <span
                className={cn(
                  "tabular flex size-11 shrink-0 items-center justify-center rounded-full font-bold",
                  style ? style.pos : "bg-border/60",
                )}
              >
                {row.position}º
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold">{entry.nickname ?? `Palpite ${index + 1}`}</h2>
                <p className="text-xs text-muted">
                  {[
                    `de ${period.ranking.length} palpites`,
                    style && `${style.icon} ${style.label}`,
                    row.sharedWith > 1 && `posição dividida com ${row.sharedWith - 1}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="text-right leading-none">
                <span className="tabular text-2xl font-extrabold">{formatPoints(row.tenths)}</span>
                <span className="block text-[10px] font-medium uppercase tracking-wide text-muted">pts</span>
              </div>
            </div>

            <ul className="grid grid-cols-1 border-t border-border bg-card sm:grid-cols-2">
              {tiers.map((tier) => {
                const team = teams.get(entry.picks[tier]);
                if (!team) return null;
                return (
                  <li key={tier} className="flex items-center gap-2.5 border-b border-border/60 px-4 py-2 text-sm">
                    <span className="w-5 text-xs font-bold text-muted">{tier}</span>
                    <TeamBadge team={team} size={26} />
                    <span className="flex-1 truncate font-medium">{team.shortName}</span>
                    <span className="tabular font-semibold">{formatPoints(row.tierTenths[tier] ?? 0)}</span>
                  </li>
                );
              })}
            </ul>

            {rounds.length > 0 && (
              <div className="bg-card p-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Pontos por rodada</h3>
                <div className="flex h-28 items-stretch gap-[3px]">
                  {rounds.map((r) => {
                    const value = perRound.get(r) ?? 0;
                    const height = `${Math.max((Math.abs(value) / maxAbs) * 100, 2)}%`;
                    return (
                      <div key={r} className="flex min-w-0 flex-1 flex-col" title={`Rodada ${r}: ${formatPoints(value)} pts`}>
                        <div className="flex flex-1 flex-col justify-end">
                          <span className="tabular mb-0.5 text-center text-[9px] leading-none text-muted">
                            {formatPoints(value)}
                          </span>
                          <div
                            className={cn("rounded-t-sm", value < 0 ? "bg-danger" : "bg-primary")}
                            style={{ height }}
                          />
                        </div>
                        <span className="tabular mt-1 text-center text-[9px] leading-none text-muted">{r}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">
                  {periodEnd !== 0
                    ? `Mais ${formatPoints(periodEnd)} pts de bônus de fim de turno.`
                    : period.status === "final"
                      ? "Sem bônus de fim de turno."
                      : "Os bônus de fim de turno entram quando o turno terminar."}
                </p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
