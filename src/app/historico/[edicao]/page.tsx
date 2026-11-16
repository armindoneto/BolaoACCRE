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
      <PeriodTabs periods={result.periods} selected={period.period.id} basePath={`/historico/${edicao}`} />
      <Winners period={period} rows={rows} prizes={bundle.edition.rules.prizes.positions} />
      <RankingList rows={rows} />
    </div>
  );
}
