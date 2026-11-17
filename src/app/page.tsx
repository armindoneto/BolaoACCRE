import Link from "next/link";
import { PageTitle, EmptyState } from "@/components/page-title";
import { PendingNotice, PeriodStatusChip, PeriodTabs, UnresolvedTieNotice } from "@/components/period";
import { RankingList } from "@/components/ranking";
import { Winners } from "@/components/winners";
import { computeBundle, currentPeriod, entriesOpen, getCurrentBundle } from "@/lib/data";
import { buildRankingRows, dateTimeFmt, selectPeriod } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ turno?: string }>;
}) {
  const bundle = await getCurrentBundle();
  if (!bundle) {
    return (
      <EmptyState title="Nenhum bolão em andamento">
        Assim que o próximo bolão abrir, ele aparece aqui. Enquanto isso, veja o{" "}
        <Link href="/historico" className="font-semibold text-primary">histórico</Link>.
      </EmptyState>
    );
  }
  const { edition } = bundle;
  const result = computeBundle(bundle);
  const period = selectPeriod(result.periods, (await searchParams).turno, currentPeriod(result));
  const rows = buildRankingRows(bundle, period);
  const open = entriesOpen(edition);
  // Enquanto os palpites estão abertos, as escolhas dos outros ficam escondidas.
  const hidePicks = edition.status === "open_for_entries";
  const participants = new Set(bundle.entries.map((e) => e.participantId)).size;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle
          title="Classificação"
          subtitle={
            <>
              {edition.name} ·{" "}
              {period.lastRoundWithResult > 0
                ? `Atualizado após a rodada ${period.lastRoundWithResult}`
                : "Aguardando a primeira rodada"}
            </>
          }
        >
          <PeriodStatusChip period={period} />
        </PageTitle>
        {!hidePicks && (
          <div className="w-full lg:w-80">
            <PeriodTabs periods={result.periods} selected={period.period.id} basePath="/" />
          </div>
        )}
      </div>

      {edition.status === "open_for_entries" && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-primary/40 bg-primary-soft p-4">
          <div>
            <p className="font-bold">{open ? "Os palpites estão abertos!" : "Palpites encerrados"}</p>
            <p className="text-sm text-muted">
              {open
                ? edition.entriesDeadline
                  ? `Você pode palpitar até ${dateTimeFmt.format(new Date(edition.entriesDeadline))}.`
                  : "Escolha um time de cada nível. Leva um minuto."
                : "O bolão começa em breve. Os times de cada um aparecem quando a bola rolar."}
            </p>
          </div>
          {open && (
            <Link href="/palpite" className="btn-primary">
              Fazer meu palpite
            </Link>
          )}
        </div>
      )}

      {/* Celular: avisos e vencedores em cima da lista. Desktop: coluna à direita. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:order-2">
          <PendingNotice bundle={bundle} period={period} />
          <UnresolvedTieNotice period={period} />
          <Winners period={period} rows={rows} prizes={edition.rules.prizes.positions} />
          <section className="card hidden p-4 text-sm lg:block">
            <h2 className="font-bold">{edition.name}</h2>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Participantes</dt>
                <dd className="tabular font-semibold">{participants}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Palpites</dt>
                <dd className="tabular font-semibold">{bundle.entries.length}</dd>
              </div>
            </dl>
            {edition.prizesText && (
              <p className="mt-3 whitespace-pre-line border-t border-border pt-3 text-muted">{edition.prizesText}</p>
            )}
          </section>
          <p className="no-print hidden flex-col gap-2 lg:flex">
            <Link href="/regras" className="btn-outline">Ver as regras</Link>
            <Link href="/meus-palpites" className="btn-outline">Meus palpites</Link>
          </p>
        </aside>

        <div className="min-w-0 lg:order-1">
          {rows.length === 0 ? (
            <EmptyState title="Ainda não há palpites">Os palpites aparecem aqui assim que forem feitos.</EmptyState>
          ) : hidePicks ? (
            <section className="card p-4">
              <h2 className="font-bold">
                {rows.length} {rows.length === 1 ? "palpite feito" : "palpites feitos"}
              </h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {[...rows]
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }))
                  .map((r) => (
                    <li key={r.entryId} className="chip bg-border/60 text-fg">
                      {r.name}
                      {r.nickname && <span className="font-normal text-muted">({r.nickname})</span>}
                    </li>
                  ))}
              </ul>
            </section>
          ) : (
            <RankingList rows={rows} />
          )}
        </div>
      </div>

      <p className="no-print flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-sm lg:hidden">
        <Link href="/regras" className="font-semibold text-primary">Ver as regras</Link>
        <Link href="/meus-palpites" className="font-semibold text-primary">Meus palpites</Link>
      </p>
    </div>
  );
}
