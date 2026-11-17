import { EmptyState } from "@/components/page-title";
import { PeriodTabs } from "@/components/period";
import { computeBundle, currentPeriod } from "@/lib/data";
import { prizeStyle } from "@/lib/prize-style";
import { buildRankingRows, selectPeriod } from "@/lib/view";
import { cn } from "@/lib/cn";
import { adminBundle } from "../shared";
import { PrintButton } from "./print-button";

/** Classificação em formato de folha, para imprimir ou salvar em PDF. */
export default async function ExportarPage({
  searchParams,
}: {
  searchParams: Promise<{ edicao?: string; turno?: string }>;
}) {
  const params = await searchParams;
  const bundle = await adminBundle(params.edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const result = computeBundle(bundle);
  const period = selectPeriod(result.periods, params.turno, currentPeriod(result));
  const rows = buildRankingRows(bundle, period);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PeriodTabs
        periods={result.periods}
        selected={period.period.id}
        basePath="/admin/exportar"
        extra={{ edicao: bundle.edition.id }}
      />
      <PrintButton />
      <article className="rounded-2xl border border-border bg-white p-4 text-black print:border-0 print:p-0">
        <h1 className="text-xl font-extrabold">Bolão ACC-RE · {bundle.edition.name}</h1>
        <p className="text-sm text-neutral-600">
          Classificação do {period.period.name}
          {period.lastRoundWithResult > 0 && ` · após a rodada ${period.lastRoundWithResult}`}
          {period.status === "pending" && " · PARCIAL (aguardando jogo adiado)"}
          {period.status === "final" && " · FINAL"}
        </p>
        <table className="tabular mt-3 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="w-8 py-1">#</th>
              <th className="py-1">Palpite</th>
              <th className="py-1">Times</th>
              <th className="w-12 py-1 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const style = prizeStyle(row.prizes[0]);
              return (
                <tr key={row.entryId} className={cn("border-b border-neutral-300", style && "font-semibold")}>
                  <td className="py-1">{row.position}º</td>
                  <td className="py-1">
                    {style && `${style.icon} `}
                    {row.name}
                    {row.participantName && row.participantName !== row.name && (
                      <span className="font-normal text-neutral-600"> ({row.participantName})</span>
                    )}
                  </td>
                  <td className="py-1 text-[10px] tracking-tight text-neutral-700">
                    {row.teams.map((t) => t.code).join(" ")}
                  </td>
                  <td className="py-1 text-right text-sm font-bold">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
    </div>
  );
}
