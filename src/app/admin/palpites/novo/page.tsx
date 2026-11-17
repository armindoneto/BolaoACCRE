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
  const chosen = participants.find((p) => p.id === params.participante);
  // Sugestão de nome: "Fulano" ou "Fulano 2", conforme os palpites que a pessoa já tem.
  const existing = chosen ? bundle.entries.filter((e) => e.participantId === chosen.id).length : 0;
  return (
    <div className="space-y-4">
      <EditionHeader edition={bundle.edition} title="Novo palpite" />
      <PickForm
        tiers={pickFormTiers(bundle)}
        participants={participants.map((p) => ({ id: p.id, name: p.name }))}
        initial={{
          name: chosen ? (existing > 0 ? `${chosen.name} ${existing + 1}` : chosen.name) : "",
          participantId: chosen?.id ?? "",
        }}
        submitLabel="Cadastrar palpite"
        onSave={adminCreateEntry.bind(null, bundle.edition.id)}
      />
    </div>
  );
}
