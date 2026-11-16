import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteOwnEntry } from "@/app/actions";
import { computeBundle, currentPeriod, entriesOpen, type EditionBundle, type TokenAccess } from "@/lib/data";
import { formatPoints } from "@/lib/scoring";
import { dateTimeFmt, teamMap, tiersOf } from "@/lib/view";
import { ConfirmButton } from "./confirm-button";
import { TeamBadge } from "./team-badge";

/** Lista dos palpites de uma pessoa, com editar/excluir enquanto o prazo está aberto. */
export function MyEntries({
  bundle,
  access,
  token,
}: {
  bundle: EditionBundle;
  access: TokenAccess;
  /** Token do link pessoal; null quando a pessoa entrou com conta. */
  token: string | null;
}) {
  const open = entriesOpen(bundle.edition);
  const teams = teamMap(bundle);
  const tiers = tiersOf(bundle);
  const started = bundle.edition.status === "running" || bundle.edition.status === "finished";
  const period = started ? currentPeriod(computeBundle(bundle)) : null;
  const editBase = token ? `/meu/${token}/editar` : "/meus-palpites/editar";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {open
          ? bundle.edition.entriesDeadline
            ? `Você pode mudar seus palpites até ${dateTimeFmt.format(new Date(bundle.edition.entriesDeadline))}.`
            : "Você pode mudar seus palpites até o prazo fechar."
          : "O prazo terminou: os palpites estão travados até o fim do campeonato."}
      </p>

      {access.entries.map((entry, index) => {
        const row = period?.ranking.find((r) => r.entryId === entry.id);
        return (
          <section key={entry.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">{entry.nickname ?? `Palpite ${index + 1}`}</h2>
              {row && period && (
                <span className="tabular text-sm font-semibold">
                  {row.position}º · {formatPoints(row.tenths)} pts
                  <span className="font-normal text-muted"> ({period.period.name})</span>
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

      {open && (
        <Link href={token ? `/palpite?link=${token}` : "/palpite"} className="btn-outline min-h-12 w-full">
          <Plus className="size-4" /> Fazer mais um palpite
        </Link>
      )}
      {started && (
        <Link href={`/participante/${access.participantId}`} className="btn-primary min-h-12 w-full">
          Ver minha pontuação
        </Link>
      )}
    </div>
  );
}
