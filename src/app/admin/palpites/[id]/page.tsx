import { notFound } from "next/navigation";
import { PickForm } from "@/components/pick-form";
import { pickFormTiers } from "@/lib/pick-form-data";
import { adminUpdateEntry } from "../../actions";
import { EditionHeader } from "../../edition-header";
import { adminBundle } from "../../shared";

export default async function EditarPalpiteAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edicao?: string }>;
}) {
  const { id } = await params;
  const bundle = await adminBundle((await searchParams).edicao);
  const entry = bundle?.entries.find((e) => e.id === id);
  if (!bundle || !entry) notFound();
  return (
    <div className="space-y-4">
      <EditionHeader edition={bundle.edition} title="Editar palpite" />
      <PickForm
        tiers={pickFormTiers(bundle)}
        askName
        initial={{ name: entry.participantName, nickname: entry.nickname, picks: entry.picks }}
        submitLabel="Salvar palpite"
        onSave={adminUpdateEntry.bind(null, bundle.edition.id, entry.id)}
      />
    </div>
  );
}
