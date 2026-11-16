import { Trophy } from "lucide-react";
import { prizeName, type PeriodResult, type PrizePosition } from "@/lib/scoring";
import type { RankingViewRow } from "@/lib/view";
import { cn } from "@/lib/cn";
import { prizeStyle } from "@/lib/prize-style";

/** Bloco "Vencedores do turno": só aparece quando o turno está encerrado. */
export function Winners({
  period,
  rows,
  prizes,
}: {
  period: PeriodResult;
  rows: RankingViewRow[];
  prizes: PrizePosition[];
}) {
  if (period.status !== "final" || rows.length === 0) return null;
  const groups = prizes
    .map((prize) => ({ prize, winners: rows.filter((r) => r.prizes.includes(prize)) }))
    .filter((g) => g.winners.length > 0);
  if (groups.length === 0) return null;

  return (
    <section className="card overflow-hidden">
      <h2 className="flex items-center gap-2 bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg">
        <Trophy className="size-4" /> Vencedores do {period.period.name}
      </h2>
      <ul className="divide-y divide-border">
        {groups.map(({ prize, winners }) => {
          const style = prizeStyle(prize)!;
          return (
            <li key={String(prize)} className="flex items-start gap-3 px-4 py-2.5">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-lg", style.pos)}>
                {style.icon}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {prizeName(prize)}
                  {winners.length > 1 && ` · prêmio dividido por ${winners.length}`}
                </p>
                <p className="font-semibold">
                  {winners.map((w) => (w.nickname ? `${w.name} (${w.nickname})` : w.name)).join(", ")}
                </p>
                <p className="tabular text-sm text-muted">{winners[0].points} pts</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
