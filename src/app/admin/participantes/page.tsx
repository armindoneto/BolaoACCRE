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
  const inEdition = new Map<string, number>();
  for (const e of bundle.entries) inEdition.set(e.participantId, (inEdition.get(e.participantId) ?? 0) + 1);
  const options = participants.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-4">
      <EditionHeader edition={bundle.edition} title={`Participantes (${participants.length})`} />
      <p className="text-sm text-muted">
        Cada pessoa tem um cadastro só, com ou sem conta, que reúne os palpites de todas as edições. Se a mesma
        pessoa aparecer duas vezes (por exemplo, palpitou pelo site com outro nome), use <strong>Juntar</strong>.
      </p>
      <NewParticipantForm />
      {participants.length === 0 ? (
        <EmptyState title="Nenhum participante ainda" />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {participants.map((p) => (
            <li key={p.id}>
              <ParticipantCard
                participant={p}
                editionId={bundle.edition.id}
                inEdition={inEdition.get(p.id) ?? 0}
                trophies={trophies.get(p.id) ?? { gold: 0, silver: 0, bronze: 0, last: 0 }}
                others={options.filter((o) => o.id !== p.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
