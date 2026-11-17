import { notFound } from "next/navigation";
import { updateOwnEntry } from "@/app/actions";
import { EmptyState, PageTitle } from "@/components/page-title";
import { PickForm } from "@/components/pick-form";
import { entriesOpen, getCurrentBundle, repo } from "@/lib/data";
import { pickFormTiers } from "@/lib/pick-form-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mudar palpite", robots: { index: false } };

export default async function EditarPalpitePage({
  params,
}: {
  params: Promise<{ token: string; entryId: string }>;
}) {
  const { token, entryId } = await params;
  const participant = await repo().getParticipantByToken(token);
  const bundle = await getCurrentBundle();
  const entry = bundle?.entries.find((e) => e.id === entryId && e.participantId === participant?.id);
  if (!participant || !entry || !bundle) notFound();
  if (!entriesOpen(bundle.edition)) {
    return <EmptyState title="O prazo terminou">Os palpites não podem mais ser alterados.</EmptyState>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageTitle title="Mudar palpite" subtitle={`${participant.name} · ${bundle.edition.name}`} />
      <PickForm
        tiers={pickFormTiers(bundle)}
        askName={false}
        initial={{ nickname: entry.nickname, picks: entry.picks }}
        submitLabel="Salvar palpite"
        onSave={updateOwnEntry.bind(null, token, entryId)}
      />
    </div>
  );
}
