import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/page-title";
import { TrophyRow } from "@/components/trophies";
import { repo } from "@/lib/data";
import { getPublicEditions, trophiesByParticipant, trophyTotal } from "@/lib/history";
import { prizeName } from "@/lib/scoring";
import { buildRankingRows } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Histórico" };

export default async function HistoricoPage() {
  const all = await getPublicEditions();
  const finished = all.filter((e) => e.bundle.edition.status === "finished");
  const trophies = trophiesByParticipant(all);
  const names = new Map((await repo().listParticipants()).map((p) => [p.id, p.name]));
  // Quadro de troféus: mais ouros primeiro, depois pratas, bronzes e total.
  const board = [...trophies.entries()]
    .filter(([id, t]) => names.has(id) && trophyTotal(t) > 0)
    .sort(
      ([a, x], [b, y]) =>
        y.gold - x.gold ||
        y.silver - x.silver ||
        y.bronze - x.bronze ||
        y.last - x.last ||
        names.get(a)!.localeCompare(names.get(b)!, "pt-BR"),
    );

  return (
    <div className="space-y-4">
      <PageTitle title="Histórico" subtitle="Os premiados das edições anteriores e o quadro de troféus." />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
        <div className="space-y-3">
          {finished.length === 0 ? (
            <EmptyState title="Ainda não há edições encerradas">
              Quando um bolão terminar, os premiados de cada turno ficam guardados aqui.
            </EmptyState>
          ) : (
            finished.map(({ bundle, result }) => (
              <Link
                key={bundle.edition.id}
                href={`/historico/${bundle.edition.id}`}
                className="card block p-4 hover:border-primary/50"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{bundle.edition.name}</h2>
                  <ChevronRight className="size-5 text-muted" />
                </div>
                <p className="text-xs text-muted">{bundle.entries.length} palpites</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {result.periods.map((period) => {
                    const rows = buildRankingRows(bundle, period);
                    return (
                      <div key={period.period.id} className="text-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted">{period.period.name}</p>
                        {period.status !== "final" ? (
                          <p className="text-muted">Sem resultado final.</p>
                        ) : (
                          bundle.edition.rules.prizes.positions.map((prize) => {
                            const winners = rows.filter((r) => r.prizes.includes(prize));
                            if (winners.length === 0) return null;
                            return (
                              <p key={String(prize)}>
                                <span className="text-muted">{prizeName(prize)}:</span>{" "}
                                <span className="font-medium">{winners.map((w) => w.name).join(", ")}</span>
                              </p>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              </Link>
            ))
          )}
        </div>

        <section className="card overflow-hidden">
          <h2 className="border-b border-border px-4 py-2.5 font-bold">Quadro de troféus</h2>
          {board.length === 0 ? (
            <p className="p-4 text-sm text-muted">Os troféus aparecem quando o primeiro turno for encerrado.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {board.map(([id, t]) => (
                <li key={id}>
                  <Link
                    href={`/participante/${id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-primary-soft"
                  >
                    <span className="min-w-0 truncate text-sm font-semibold">{names.get(id)}</span>
                    <TrophyRow trophies={t} size={28} hideEmpty className="gap-1.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-border px-4 py-2 text-xs text-muted">
            Um troféu por palpite premiado em cada turno encerrado: ouro (1º), prata (2º), bronze (3º) e vermelho
            (último).
          </p>
        </section>
      </div>
    </div>
  );
}
