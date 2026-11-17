import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryDetail } from "@/components/entry-detail";
import { PendingNotice, PeriodTabs } from "@/components/period";
import { TrophyRow } from "@/components/trophies";
import { currentPeriod, pickCurrentEdition, repo } from "@/lib/data";
import { getPublicEditions, participantHistory, trophiesOf, trophyTotal } from "@/lib/history";
import { prizeStyle } from "@/lib/prize-style";
import { formatPoints } from "@/lib/scoring";
import { cn } from "@/lib/cn";
import { selectPeriod } from "@/lib/view";

export const dynamic = "force-dynamic";

/** Perfil do participante: troféus, palpites da edição atual e histórico. Não exige conta. */
export default async function ParticipantePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ turno?: string }>;
}) {
  const { id } = await params;
  const participant = await repo().getParticipant(id);
  if (!participant) notFound();

  const all = await getPublicEditions();
  const history = participantHistory(all, id);
  const trophies = trophiesOf(all, id);
  const currentId = pickCurrentEdition(all.map((e) => e.bundle.edition))?.id;
  const current = history.find((h) => h.bundle.edition.id === currentId);
  const past = history.filter((h) => h !== current);
  const totalEntries = history.reduce((sum, h) => sum + h.entries.length, 0);
  // Enquanto os palpites estão abertos, os times escolhidos ficam escondidos.
  const hidden = current?.bundle.edition.status === "open_for_entries";
  const period =
    current && !hidden
      ? selectPeriod(current.result.periods, (await searchParams).turno, currentPeriod(current.result))
      : null;

  return (
    <div className="space-y-5">
      <Link href="/" className="no-print inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ChevronLeft className="size-4" /> Classificação
      </Link>

      <header className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-primary-fg">
            {participant.name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{participant.name}</h1>
            <p className="text-sm text-muted">
              {totalEntries === 0
                ? "Ainda sem palpites"
                : `${totalEntries} ${totalEntries === 1 ? "palpite" : "palpites"} em ${history.length} ${history.length === 1 ? "edição" : "edições"}`}
            </p>
          </div>
        </div>
        <div>
          <TrophyRow trophies={trophies} size={48} labels className="gap-3" />
          <p className="mt-1 text-center text-xs text-muted">
            {trophyTotal(trophies) === 0 ? "Nenhum prêmio ainda" : "Prêmios conquistados"}
          </p>
        </div>
      </header>

      {current && hidden && (
        <section className="card p-4">
          <h2 className="font-bold">{current.bundle.edition.name}</h2>
          <p className="text-sm text-muted">
            {current.entries.length} {current.entries.length === 1 ? "palpite feito" : "palpites feitos"}. Os times
            aparecem quando o bolão começar.
          </p>
        </section>
      )}

      {current && period && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-bold">{current.bundle.edition.name}</h2>
            <div className="w-full sm:w-80">
              <PeriodTabs
                periods={current.result.periods}
                selected={period.period.id}
                basePath={`/participante/${id}`}
              />
            </div>
          </div>
          <PendingNotice bundle={current.bundle} period={period} />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {current.entries.map(({ entry, label }) => (
              <EntryDetail key={entry.id} bundle={current.bundle} period={period} entry={entry} label={label} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Edições anteriores</h2>
          <div className="grid items-start gap-3 lg:grid-cols-2">
            {past.map(({ bundle, entries }) => (
              <article key={bundle.edition.id} className="card overflow-hidden">
                <Link
                  href={bundle.edition.status === "finished" ? `/historico/${bundle.edition.id}` : "/"}
                  className="flex items-center justify-between border-b border-border px-4 py-2.5 hover:bg-primary-soft"
                >
                  <h3 className="font-bold">{bundle.edition.name}</h3>
                  <ChevronRight className="size-4 text-muted" />
                </Link>
                <ul className="divide-y divide-border/60">
                  {entries.map(({ entry, label, periods }) => (
                    <li key={entry.id} className="px-4 py-2.5">
                      <p className="text-sm font-semibold">
                        {label}
                        {entry.nickname && <span className="font-normal text-muted"> · {entry.nickname}</span>}
                      </p>
                      <ul className="mt-1 grid grid-cols-2 gap-2">
                        {periods.map((p) => {
                          const style = p.status === "final" ? prizeStyle(p.prizes[0]) : null;
                          return (
                            <li
                              key={p.id}
                              className={cn("rounded-xl border border-border px-2.5 py-1.5 text-sm", style?.row)}
                            >
                              <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
                                {p.name}
                              </span>
                              <span className="tabular font-bold">{p.position}º</span>
                              <span className="tabular text-muted"> de {p.of} · {formatPoints(p.tenths)} pts</span>
                              {style && <span className="ml-1">{style.icon}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {history.length === 0 && (
        <p className="card p-6 text-center text-sm text-muted">Este participante ainda não fez palpites.</p>
      )}
    </div>
  );
}
