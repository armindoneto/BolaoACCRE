import { notFound } from "next/navigation";
import { PickForm } from "@/components/pick-form";
import { repo } from "@/lib/data";
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
  const participants = await repo().listParticipants();
  return (
    <div className="space-y-4">
      <EditionHeader edition={bundle.edition} title="Editar palpite" />
      <p className="text-sm text-muted">
        Para passar o palpite para outra pessoa, troque o participante. Para corrigir o nome de alguém, use a aba
        Participantes.
      </p>
      <PickForm
        tiers={pickFormTiers(bundle)}
        askName
        participants={participants.map((p) => ({ id: p.id, name: p.name }))}
        initialParticipantId={entry.participantId}
        initial={{ nickname: entry.nickname, picks: entry.picks }}
        submitLabel="Salvar palpite"
        onSave={adminUpdateEntry.bind(null, bundle.edition.id, entry.id)}
      />
    </div>
  );
}
