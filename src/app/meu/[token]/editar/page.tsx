import { notFound } from "next/navigation";
import { updateOwnEntry } from "@/app/actions";
import { EmptyState, PageTitle } from "@/components/page-title";
import { PickForm } from "@/components/pick-form";
import { entriesOpen, getBundle, repo } from "@/lib/data";
import { pickFormTiers } from "@/lib/pick-form-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mudar palpite", robots: { index: false } };

export default async function EditarPalpitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await repo().getEntryByToken(token);
  const bundle = found ? await getBundle(found.editionId) : null;
  const entry = bundle?.entries.find((e) => e.id === found?.entryId);
  if (!bundle || !entry) notFound();
  if (!entriesOpen(bundle.edition)) {
    return <EmptyState title="O prazo terminou">Os palpites não podem mais ser alterados.</EmptyState>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageTitle title="Mudar palpite" subtitle={bundle.edition.name} />
      <PickForm
        tiers={pickFormTiers(bundle)}
        initial={{ name: entry.name, picks: entry.picks }}
        submitLabel="Salvar palpite"
        onSave={updateOwnEntry.bind(null, token)}
      />
    </div>
  );
}
