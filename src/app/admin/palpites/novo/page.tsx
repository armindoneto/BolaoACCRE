import { EmptyState } from "@/components/page-title";
import { PickForm } from "@/components/pick-form";
import { pickFormTiers } from "@/lib/pick-form-data";
import { adminCreateEntry } from "../../actions";
import { EditionHeader } from "../../edition-header";
import { adminBundle } from "../../shared";

export default async function NovoPalpitePage({ searchParams }: { searchParams: Promise<{ edicao?: string }> }) {
  const bundle = await adminBundle((await searchParams).edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const names = [...new Set(bundle.entries.map((e) => e.participantName))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return (
    <div className="space-y-4">
      <EditionHeader edition={bundle.edition} title="Novo palpite" />
      <p className="text-sm text-muted">
        Se o nome for de alguém que já palpitou, este entra como mais um palpite da mesma pessoa.
      </p>
      <PickForm
        tiers={pickFormTiers(bundle)}
        askName
        nameSuggestions={names}
        submitLabel="Cadastrar palpite"
        onSave={adminCreateEntry.bind(null, bundle.edition.id)}
      />
    </div>
  );
}
