import { notFound } from "next/navigation";
import { PageTitle } from "@/components/page-title";
import { PeriodTabs } from "@/components/period";
import { RankingList } from "@/components/ranking";
import { Winners } from "@/components/winners";
import { computeBundle, getBundle } from "@/lib/data";
import { buildRankingRows, selectPeriod } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function HistoricoEdicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ edicao: string }>;
  searchParams: Promise<{ turno?: string }>;
}) {
  const { edicao } = await params;
  const bundle = await getBundle(edicao);
  if (!bundle || bundle.edition.status !== "finished") notFound();
  const result = computeBundle(bundle);
  const period = selectPeriod(result.periods, (await searchParams).turno, result.periods[0]);
  const rows = buildRankingRows(bundle, period);

  return (
    <div className="space-y-4">
      <PageTitle title={bundle.edition.name} subtitle={`Classificação final · ${period.period.name}`} />
      <div className="lg:max-w-sm">
        <PeriodTabs periods={result.periods} selected={period.period.id} basePath={`/historico/${edicao}`} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <aside className="lg:sticky lg:top-20 lg:order-2">
          <Winners period={period} rows={rows} prizes={bundle.edition.rules.prizes.positions} />
        </aside>
        <div className="min-w-0 lg:order-1">
          <RankingList rows={rows} />
        </div>
      </div>
    </div>
  );
}
