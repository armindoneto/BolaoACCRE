import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { getBundle } from "@/lib/data";
import { tiersOf } from "@/lib/view";
import { deleteEdition } from "../../actions";
import { EditionForm } from "./edition-form";

/** ISO -> valor de <input type="datetime-local"> no horário de Brasília. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const shifted = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return shifted.toISOString().slice(0, 16);
}

export default async function EditarEdicaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getBundle(id);
  if (!bundle) notFound();
  const { edition } = bundle;
  const names = new Map(bundle.teams.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Editar edição</h1>
      {edition.importedResults && (
        <p className="rounded-2xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          Esta é uma edição antiga importada: os pontos vieram prontos da planilha. Para corrigir os números,
          exclua a edição e importe de novo.
        </p>
      )}
      <EditionForm
        editionId={edition.id}
        locked={bundle.entries.length > 0 || bundle.matches.length > 0}
        periods={edition.rules.periods.map((p) => ({ id: p.id, name: p.name }))}
        initial={{
          name: edition.name,
          season: edition.season,
          status: edition.status,
          deadline: toLocalInput(edition.entriesDeadline),
          prizesText: edition.prizesText ?? "",
          rulesJson: JSON.stringify(edition.rules, null, 2),
          tiersText: tiersOf(bundle)
            .map((tier) => `${tier}: ${bundle.teams.filter((t) => t.tier === tier).map((t) => t.name).join(", ")}`)
            .join("\n"),
          manualOrder: Object.fromEntries(
            edition.rules.periods.map((p) => [
              p.id,
              (edition.manualStandingsOrder[p.id] ?? []).map((teamId) => names.get(teamId) ?? "").filter(Boolean).join("\n"),
            ]),
          ),
        }}
      />
      {(edition.status === "draft" || edition.importedResults) && (
        <ConfirmButton
          action={deleteEdition.bind(null, edition.id)}
          confirm={`Excluir a edição "${edition.name}"? Isso apaga também os jogos e palpites dela.`}
          className="btn-danger w-full"
        >
          {edition.importedResults ? "Excluir esta edição importada" : "Excluir este rascunho"}
        </ConfirmButton>
      )}
    </div>
  );
}
