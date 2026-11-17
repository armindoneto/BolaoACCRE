import { EmptyState } from "@/components/page-title";
import { repo } from "@/lib/data";
import { getPublicEditions, trophiesByParticipant } from "@/lib/history";
import { EditionHeader } from "../edition-header";
import { adminBundle } from "../shared";
import { NewParticipantForm, ParticipantCard } from "./participant-card";

export default async function AdminParticipantesPage({ searchParams }: { searchParams: Promise<{ edicao?: string }> }) {
  const bundle = await adminBundle((await searchParams).edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const [participants, all] = await Promise.all([repo().listParticipants(), getPublicEditions()]);
  const trophies = trophiesByParticipant(all);
  const inEdition = new Map<string, string[]>();
  for (const e of bundle.entries) {
    if (e.participantId) inEdition.set(e.participantId, [...(inEdition.get(e.participantId) ?? []), e.name]);
  }

  return (
    <div className="space-y-4">
      <EditionHeader edition={bundle.edition} title={`Participantes (${participants.length})`} />
      <p className="text-sm text-muted">
        Só você cadastra participantes: basta o nome. Cada um ganha um perfil no site, que reúne os palpites de todas
        as edições. Os palpites são atribuídos a eles na aba Palpites.
      </p>
      <NewParticipantForm />
      {participants.length === 0 ? (
        <EmptyState title="Nenhum participante ainda" />
      ) : (
        <ul className="grid items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
          {participants.map((p) => (
            <li key={p.id}>
              <ParticipantCard
                participant={p}
                editionId={bundle.edition.id}
                entryNames={(inEdition.get(p.id) ?? []).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))}
                trophies={trophies.get(p.id) ?? { gold: 0, silver: 0, bronze: 0, last: 0 }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
