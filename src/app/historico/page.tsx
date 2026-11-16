import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/page-title";
import { computeBundle, getBundle, listEditions } from "@/lib/data";
import { prizeName } from "@/lib/scoring";
import { buildRankingRows } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Histórico" };

export default async function HistoricoPage() {
  const editions = (await listEditions()).filter((e) => e.status === "finished");
  const bundles = (await Promise.all(editions.map((e) => getBundle(e.id)))).filter((b) => b !== null);

  return (
    <div className="space-y-4">
      <PageTitle title="Histórico" subtitle="Os campeões das edições anteriores." />
      {bundles.length === 0 ? (
        <EmptyState title="Ainda não há edições encerradas">
          Quando um bolão terminar, os premiados de cada turno ficam guardados aqui.
        </EmptyState>
      ) : (
        bundles.map((bundle) => {
          const result = computeBundle(bundle);
          return (
            <Link key={bundle.edition.id} href={`/historico/${bundle.edition.id}`} className="card block p-4 hover:border-primary/50">
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
          );
        })
      )}
    </div>
  );
}
