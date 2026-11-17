import { EmptyState, PageTitle } from "@/components/page-title";
import { PendingNotice, PeriodStatusChip, PeriodTabs } from "@/components/period";
import { TeamScores } from "@/components/team-scores";
import { computeBundle, currentPeriod, getCurrentBundle } from "@/lib/data";
import { selectPeriod } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Times" };

export default async function TimesPage({ searchParams }: { searchParams: Promise<{ turno?: string }> }) {
  const bundle = await getCurrentBundle();
  if (!bundle) return <EmptyState title="Nenhum bolão em andamento" />;
  const result = computeBundle(bundle);
  const period = selectPeriod(result.periods, (await searchParams).turno, currentPeriod(result));

  return (
    <div className="space-y-4">
      <PageTitle title="Times" subtitle="Quanto cada time já pontuou, e de onde veio cada ponto.">
        <PeriodStatusChip period={period} />
      </PageTitle>
      <div className="lg:max-w-sm">
        <PeriodTabs periods={result.periods} selected={period.period.id} basePath="/times" />
      </div>
      <PendingNotice bundle={bundle} period={period} />

      <TeamScores bundle={bundle} period={period} />
    </div>
  );
}
