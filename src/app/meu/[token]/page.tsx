import { PartyPopper, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteOwnEntry } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { PageTitle } from "@/components/page-title";
import { ShareLink } from "@/components/share-link";
import { TeamBadge } from "@/components/team-badge";
import { entriesOpen, getBundle, repo } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";
import { dateTimeFmt, teamMap, tiersOf } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meu palpite", robots: { index: false } };

/** Página de um palpite, aberta pelo link de edição que a pessoa recebe ao enviar. */
export default async function MeuPalpitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { token } = await params;
  const found = await repo().getEntryByToken(token);
  const bundle = found ? await getBundle(found.editionId) : null;
  const entry = bundle?.entries.find((e) => e.id === found?.entryId);
  if (!bundle || !entry) notFound();
  const isNew = (await searchParams).novo === "1";
  const open = entriesOpen(bundle.edition);
  const teams = teamMap(bundle);
  const url = `${await siteUrl()}/meu/${token}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {isNew && (
        <div className="card flex items-center gap-3 border-primary/40 bg-primary-soft p-4">
          <PartyPopper className="size-7 shrink-0 text-primary" />
          <div>
            <p className="font-bold">Palpite enviado!</p>
            <p className="text-sm">O organizador vai conferir e colocar no seu nome.</p>
          </div>
        </div>
      )}
      <PageTitle title={entry.name} subtitle={`Palpite · ${bundle.edition.name}`} />

      <section className="card p-4">
        <ul className="grid grid-cols-5 gap-x-1 gap-y-3">
          {tiersOf(bundle).map((tier) => {
            const team = teams.get(entry.picks[tier]);
            return (
              <li key={tier} className="flex flex-col items-center gap-0.5 text-center">
                {team && <TeamBadge team={team} size={34} />}
                <span className="w-full truncate text-[11px] leading-tight text-muted">{team?.shortName ?? "?"}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-muted">
          {open
            ? bundle.edition.entriesDeadline
              ? `Você pode mudar este palpite até ${dateTimeFmt.format(new Date(bundle.edition.entriesDeadline))}.`
              : "Você pode mudar este palpite até o prazo fechar."
            : "O prazo terminou: o palpite está travado até o fim do campeonato."}
        </p>
        {open && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href={`/meu/${token}/editar`} className="btn-outline">
              <Pencil className="size-4" /> Mudar palpite
            </Link>
            <ConfirmButton
              action={deleteOwnEntry.bind(null, token)}
              confirm="Excluir este palpite? Não dá para desfazer."
              className="btn-danger"
            >
              <Trash2 className="size-4" /> Excluir
            </ConfirmButton>
          </div>
        )}
      </section>

      {open && (
        <section className="card space-y-2 p-4">
          <h2 className="font-bold">Guarde este link</h2>
          <p className="text-sm text-muted">
            É só por ele que dá para mudar este palpite. Mande para você mesmo no WhatsApp para não perder.
          </p>
          <ShareLink url={url} message={`Meu palpite "${entry.name}" no Bolão ACC-RE:`} />
        </section>
      )}

      {open ? (
        <Link href="/palpite" className="btn-primary min-h-12 w-full">
          <Plus className="size-4" /> Fazer mais um palpite
        </Link>
      ) : (
        <Link
          href={entry.participantId ? `/participante/${entry.participantId}` : "/"}
          className="btn-primary min-h-12 w-full"
        >
          Ver a pontuação
        </Link>
      )}
    </div>
  );
}
