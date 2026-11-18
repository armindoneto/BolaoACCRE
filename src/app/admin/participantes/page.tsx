import { EmptyState } from "@/components/page-title";
import { getBundle, listEditions, repo, type EditionBundle } from "@/lib/data";
import { getPublicEditions, trophiesByParticipant } from "@/lib/history";
import { adminBundle } from "../shared";
import { NewParticipantForm } from "./participant-card";
import { ParticipantList } from "./participant-list";

export default async function AdminParticipantesPage({ searchParams }: { searchParams: Promise<{ edicao?: string }> }) {
  const [bundle, participants, all, editions] = await Promise.all([
    adminBundle((await searchParams).edicao),
    repo().listParticipants(),
    getPublicEditions(),
    listEditions(),
  ]);
  const trophies = trophiesByParticipant(all);
  const ordered = [...editions].sort((a, b) => b.season - a.season || a.name.localeCompare(b.name));
  const bundles = (await Promise.all(ordered.map((e) => getBundle(e.id)))).filter((b): b is EditionBundle => b !== null);

  // Palpites de cada pessoa, edição por edição.
  const byParticipant = new Map<string, { editionId: string; entryNames: string[] }[]>();
  for (const b of bundles) {
    const names = new Map<string, string[]>();
    for (const e of b.entries) {
      if (e.participantId) names.set(e.participantId, [...(names.get(e.participantId) ?? []), e.name]);
    }
    for (const [participantId, entryNames] of names) {
      byParticipant.set(participantId, [
        ...(byParticipant.get(participantId) ?? []),
        { editionId: b.edition.id, entryNames: entryNames.sort((x, y) => x.localeCompare(y, "pt-BR", { numeric: true })) },
      ]);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Participantes ({participants.length})</h1>
        <p className="text-sm text-muted">
          Só você cadastra participantes: basta o nome. Cada um ganha um perfil no site, que reúne os palpites de todas
          as edições. Os palpites são atribuídos a eles na aba Palpites.
        </p>
      </div>
      <NewParticipantForm />
      {participants.length === 0 ? (
        <EmptyState title="Nenhum participante ainda" />
      ) : (
        <ParticipantList
          items={participants.map((p) => ({
            participant: p,
            trophies: trophies.get(p.id) ?? { gold: 0, silver: 0, bronze: 0, last: 0 },
            editions: byParticipant.get(p.id) ?? [],
          }))}
          editions={ordered.map((e) => ({ id: e.id, name: e.name }))}
          workingEditionId={bundle?.edition.id ?? ""}
        />
      )}
    </div>
  );
}
