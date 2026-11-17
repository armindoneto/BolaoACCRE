import Link from "next/link";
import { PageTitle, EmptyState } from "@/components/page-title";
import { PendingNotice, PeriodStatusChip, PeriodTabs, UnresolvedTieNotice } from "@/components/period";
import { RankingList } from "@/components/ranking";
import { Winners } from "@/components/winners";
import { computeBundle, currentPeriod, entriesOpen, getCurrentBundle, type EditionBundle } from "@/lib/data";
import { buildRankingRows, dateTimeFmt, selectPeriod, tiersOf } from "@/lib/view";

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
        Assim que o próximo bolão abrir, é aqui que você faz o seu palpite.
        <p className="mt-4">
          <Link href="/historico" className="btn-primary">Ver os bolões anteriores</Link>
        </p>
      </EmptyState>
    );
  }
  // Antes de começar, a página inicial é o convite para palpitar (sem classificação).
  if (bundle.edition.status === "open_for_entries") return <EntriesOpenHome bundle={bundle} />;

  const { edition } = bundle;
  const result = computeBundle(bundle);
  const period = selectPeriod(result.periods, (await searchParams).turno, currentPeriod(result));
  const rows = buildRankingRows(bundle, period);
  const participants = new Set(bundle.entries.map((e) => e.participantId).filter(Boolean)).size;

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
        <div className="w-full lg:w-80">
          <PeriodTabs periods={result.periods} selected={period.period.id} basePath="/" />
        </div>
      </div>

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
            <Link href="/participantes" className="btn-outline">Participantes</Link>
          </p>
        </aside>

        <div className="min-w-0 lg:order-1">
          {rows.length === 0 ? (
            <EmptyState title="Ainda não há palpites">Os palpites aparecem aqui assim que forem feitos.</EmptyState>
          ) : (
            <RankingList rows={rows} />
          )}
        </div>
      </div>

      <p className="no-print flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-sm lg:hidden">
        <Link href="/regras" className="font-semibold text-primary">Ver as regras</Link>
      </p>
    </div>
  );
}

/** Página inicial enquanto o bolão recebe palpites: acesso direto ao formulário. */
function EntriesOpenHome({ bundle }: { bundle: EditionBundle }) {
  const { edition } = bundle;
  const open = entriesOpen(edition);
  const tiers = tiersOf(bundle).length;
  const names = bundle.entries.map((e) => e.name).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="card overflow-hidden border-primary/40">
        <div className="bg-primary px-5 py-8 text-center text-primary-fg sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-widest opacity-90">Bolão ACC-RE</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{edition.name}</h1>
          <p className="mt-2 text-lg font-medium">
            {open ? "Os palpites estão abertos!" : "Palpites encerrados. O bolão começa em breve!"}
          </p>
          {open && edition.entriesDeadline && (
            <p className="mt-1 text-sm opacity-90">
              Você pode palpitar até {dateTimeFmt.format(new Date(edition.entriesDeadline))}.
            </p>
          )}
        </div>
        {open && (
          <div className="p-4 sm:p-5">
            <Link href="/palpite" className="btn-primary min-h-16 w-full text-lg shadow-lg">
              Fazer meu palpite
            </Link>
          </div>
        )}
      </section>

      {open && (
        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">Como funciona</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Dê um nome ao seu palpite", "Um nome que ajude a saber que é seu."],
              ["2", `Escolha ${tiers} times`, "Um time de cada nível."],
              ["3", "Envie", "Pronto! Quer fazer mais de um? É só repetir."],
            ].map(([n, title, text]) => (
              <li key={n} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
                  {n}
                </span>
                <span>
                  <span className="block font-semibold leading-tight">{title}</span>
                  <span className="text-sm text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm">
            <Link href="/regras" className="font-semibold text-primary">Ver as regras e a pontuação</Link>
          </p>
        </section>
      )}

      <section className="card p-4 sm:p-5">
        <h2 className="font-bold">
          {names.length === 0
            ? "Ninguém palpitou ainda"
            : `${names.length} ${names.length === 1 ? "palpite feito" : "palpites feitos"}`}
        </h2>
        {names.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Seja o primeiro!</p>
        ) : (
          <>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {names.map((name) => (
                <li key={name} className="chip bg-border/60 text-fg">{name}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Os times de cada palpite aparecem quando o bolão começar.</p>
          </>
        )}
      </section>
    </div>
  );
}
