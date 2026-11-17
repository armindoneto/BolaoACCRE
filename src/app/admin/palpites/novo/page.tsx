import { EmptyState } from "@/components/page-title";
import { PickForm } from "@/components/pick-form";
import { repo } from "@/lib/data";
import { pickFormTiers } from "@/lib/pick-form-data";
import { adminCreateEntry } from "../../actions";
import { EditionHeader } from "../../edition-header";
import { adminBundle } from "../../shared";

export default async function NovoPalpitePage({
  searchParams,
}: {
  searchParams: Promise<{ edicao?: string; participante?: string }>;
}) {
  const params = await searchParams;
  const bundle = await adminBundle(params.edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const participants = await repo().listParticipants();
  return (
    <div className="space-y-4">
      <EditionHeader edition={bundle.edition} title="Novo palpite" />
      <p className="text-sm text-muted">
        Escolha de quem é o palpite. Uma pessoa pode ter vários: eles aparecem numerados (Fulano 1, Fulano 2…).
      </p>
      <PickForm
        tiers={pickFormTiers(bundle)}
        askName
        participants={participants.map((p) => ({ id: p.id, name: p.name }))}
        initialParticipantId={participants.some((p) => p.id === params.participante) ? params.participante : ""}
        submitLabel="Cadastrar palpite"
        onSave={adminCreateEntry.bind(null, bundle.edition.id)}
      />
    </div>
  );
}
