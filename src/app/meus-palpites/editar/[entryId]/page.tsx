import { notFound, redirect } from "next/navigation";
import { updateOwnEntry } from "@/app/actions";
import { EmptyState, PageTitle } from "@/components/page-title";
import { PickForm } from "@/components/pick-form";
import { getUser } from "@/lib/auth";
import { entriesOpen, getCurrentBundle, repo } from "@/lib/data";
import { pickFormTiers } from "@/lib/pick-form-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mudar palpite" };

export default async function EditarMeuPalpitePage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const user = await getUser();
  if (!user) redirect("/entrar?next=/meus-palpites");
  const bundle = await getCurrentBundle();
  const participant = await repo().getParticipantByUser(user.id);
  const entry = bundle?.entries.find((e) => e.id === entryId && e.participantId === participant?.id);
  if (!bundle || !participant || !entry) notFound();
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
        onSave={updateOwnEntry.bind(null, null, entryId)}
      />
    </div>
  );
}
