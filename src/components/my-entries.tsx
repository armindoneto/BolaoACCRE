import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteOwnEntry } from "@/app/actions";
import { computeBundle, currentPeriod, entriesOpen, type EditionBundle, type ParticipantRef } from "@/lib/data";
import { formatPoints } from "@/lib/scoring";
import { dateTimeFmt, entryLabels, teamMap, tiersOf } from "@/lib/view";
import { ConfirmButton } from "./confirm-button";
import { TeamBadge } from "./team-badge";

/** Palpites de uma pessoa na edição atual, com editar/excluir enquanto o prazo está aberto. */
export function MyEntries({
  bundle,
  participant,
  token,
}: {
  bundle: EditionBundle;
  participant: ParticipantRef;
  /** Token do link pessoal; null quando a pessoa entrou com conta. */
  token: string | null;
}) {
  const open = entriesOpen(bundle.edition);
  const teams = teamMap(bundle);
  const tiers = tiersOf(bundle);
  const labels = entryLabels(bundle);
  const entries = bundle.entries.filter((e) => e.participantId === participant.id);
  const started = bundle.edition.status === "running" || bundle.edition.status === "finished";
  const period = started ? currentPeriod(computeBundle(bundle)) : null;
  const editBase = token ? `/meu/${token}/editar` : "/meus-palpites/editar";

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">{bundle.edition.name}</h2>
        <p className="text-sm text-muted">
          {open
            ? bundle.edition.entriesDeadline
              ? `Você pode mudar seus palpites até ${dateTimeFmt.format(new Date(bundle.edition.entriesDeadline))}.`
              : "Você pode mudar seus palpites até o prazo fechar."
            : entries.length > 0
              ? "O prazo terminou: os palpites estão travados até o fim do campeonato."
              : "Você não tem palpites nesta edição."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => {
          const row = period?.ranking.find((r) => r.entryId === entry.id);
          return (
            <section key={entry.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate font-bold">
                  {labels.get(entry.id)}
                  {entry.nickname && <span className="font-normal text-muted"> · {entry.nickname}</span>}
                </h3>
                {row && period && (
                  <span className="tabular shrink-0 text-sm font-semibold">
                    {row.position}º · {formatPoints(row.tenths)} pts
                  </span>
                )}
              </div>
              <ul className="mt-3 grid grid-cols-5 gap-x-1 gap-y-2">
                {tiers.map((tier) => {
                  const team = teams.get(entry.picks[tier]);
                  return (
                    <li key={tier} className="flex flex-col items-center gap-0.5 text-center">
                      {team && <TeamBadge team={team} size={30} />}
                      <span className="w-full truncate text-[10px] leading-tight text-muted">
                        {team?.shortName ?? "?"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {open && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href={`${editBase}/${entry.id}`} className="btn-outline">
                    <Pencil className="size-4" /> Mudar times
                  </Link>
                  <ConfirmButton
                    action={deleteOwnEntry.bind(null, token, entry.id)}
                    confirm="Excluir este palpite? Não dá para desfazer."
                    className="btn-danger"
                  >
                    <Trash2 className="size-4" /> Excluir
                  </ConfirmButton>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {open && (
        <Link href={token ? `/palpite?link=${token}` : "/palpite"} className="btn-outline min-h-12 w-full">
          <Plus className="size-4" /> {entries.length > 0 ? "Fazer mais um palpite" : "Fazer meu palpite"}
        </Link>
      )}
    </div>
  );
}
