import { notFound } from "next/navigation";
import { updateOwnEntry } from "@/app/actions";
import { EmptyState, PageTitle } from "@/components/page-title";
import { PickForm } from "@/components/pick-form";
import { entriesOpen, getBundle, repo } from "@/lib/data";
import { pickFormTiers } from "@/lib/pick-form-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mudar palpite", robots: { index: false } };

export default async function EditarPalpitePage({
  params,
}: {
  params: Promise<{ token: string; entryId: string }>;
}) {
  const { token, entryId } = await params;
  const access = await repo().getByToken(token);
  const entry = access?.entries.find((e) => e.id === entryId);
  const bundle = access ? await getBundle(access.editionId) : null;
  if (!access || !entry || !bundle) notFound();
  if (!entriesOpen(bundle.edition)) {
    return <EmptyState title="O prazo terminou">Os palpites não podem mais ser alterados.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Mudar palpite" subtitle={`${access.participantName} · ${bundle.edition.name}`} />
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
