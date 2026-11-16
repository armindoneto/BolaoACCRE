import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/page-title";
import { PeriodStatusChip } from "@/components/period";
import { computeBundle } from "@/lib/data";
import { matchLabel, teamMap, toBadge } from "@/lib/view";
import { EditionHeader } from "../edition-header";
import { adminBundle } from "../shared";
import { ResultsForm } from "./results-form";

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ edicao?: string; rodada?: string }>;
}) {
  const params = await searchParams;
  const bundle = await adminBundle(params.edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const { edition, matches } = bundle;
  const result = computeBundle(bundle);
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

  if (rounds.length === 0) {
    return (
      <div className="space-y-4">
        <EditionHeader edition={edition} title="Lançar resultados" />
        <EmptyState title="Nenhum jogo cadastrado">
          Primeiro importe a tabela de jogos na aba{" "}
          <Link href={`/admin/jogos?edicao=${edition.id}`} className="font-semibold text-primary">Jogos</Link>.
        </EmptyState>
      </div>
    );
  }

  // Rodada padrão: a primeira que ainda não tem nenhum resultado (a "próxima").
  const nextRound =
    rounds.find((r) => matches.filter((m) => m.round === r).every((m) => m.homeGoals === null)) ??
    rounds[rounds.length - 1];
  const requested = Number(params.rodada);
  const round = rounds.includes(requested) ? requested : nextRound;
  const position = rounds.indexOf(round);
  const link = (r: number) => `/admin/resultados?edicao=${edition.id}&rodada=${r}`;
  const teams = teamMap(bundle);
  const postponed = result.periods.flatMap((p) => p.postponedMatches);

  return (
    <div className="space-y-4">
      <EditionHeader edition={edition} title="Lançar resultados" />

      <div className="flex flex-wrap gap-2 text-sm">
        {result.periods.map((p) => (
          <span key={p.period.id} className="flex items-center gap-1.5">
            {p.period.name}: <PeriodStatusChip period={p} />
          </span>
        ))}
      </div>

      {postponed.length > 0 && (
        <div className="rounded-2xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          <p className="font-semibold">Jogos adiados sem resultado</p>
          <ul className="mt-1 space-y-1">
            {postponed.map((m) => (
              <li key={m.id}>
                <Link href={link(m.round)} className="underline">
                  Rodada {m.round}: {matchLabel(bundle, m)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card flex items-center justify-between p-2">
        {position > 0 ? (
          <Link href={link(rounds[position - 1])} aria-label="Rodada anterior" className="btn-outline size-11 px-0">
            <ChevronLeft className="size-5" />
          </Link>
        ) : (
          <span className="size-11" />
        )}
        <h2 className="text-lg font-bold">Rodada {round}</h2>
        {position < rounds.length - 1 ? (
          <Link href={link(rounds[position + 1])} aria-label="Próxima rodada" className="btn-outline size-11 px-0">
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <span className="size-11" />
        )}
      </div>

      <ResultsForm
        key={`${edition.id}-${round}`}
        editionId={edition.id}
        matches={matches
          .filter((m) => m.round === round)
          .map((m) => ({
            id: m.id,
            home: { ...toBadge(teams.get(m.homeTeamId)!), shortName: teams.get(m.homeTeamId)!.shortName },
            away: { ...toBadge(teams.get(m.awayTeamId)!), shortName: teams.get(m.awayTeamId)!.shortName },
            homeGoals: m.homeGoals,
            awayGoals: m.awayGoals,
          }))}
      />
    </div>
  );
}
