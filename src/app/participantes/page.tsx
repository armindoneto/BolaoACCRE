import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageTitle } from "@/components/page-title";
import { TrophyRow } from "@/components/trophies";
import { getCurrentBundle } from "@/lib/data";
import { getPublicEditions, trophiesByParticipant } from "@/lib/history";

export const dynamic = "force-dynamic";
export const metadata = { title: "Participantes" };

/** Quem tem palpite no bolão em vigor, em ordem alfabética, com os nomes dos seus palpites. */
export default async function ParticipantesPage() {
  const bundle = await getCurrentBundle();
  if (!bundle) return <EmptyState title="Nenhum bolão em andamento" />;
  const trophies = trophiesByParticipant(await getPublicEditions());

  const byParticipant = new Map<string, { name: string; entries: string[] }>();
  const sorted = [...bundle.entries].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  for (const e of sorted) {
    if (!e.participantId || !e.participantName) continue;
    const item = byParticipant.get(e.participantId) ?? { name: e.participantName, entries: [] };
    item.entries.push(e.name);
    byParticipant.set(e.participantId, item);
  }
  const list = [...byParticipant.entries()].sort(([, a], [, b]) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="space-y-4">
      <PageTitle
        title="Participantes"
        subtitle={`${bundle.edition.name} · ${list.length} ${list.length === 1 ? "participante" : "participantes"}`}
      />
      {list.length === 0 ? (
        <EmptyState title="Ainda não há participantes nesta edição">
          Eles aparecem aqui assim que os palpites forem conferidos pelo organizador.
        </EmptyState>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {list.map(([id, p]) => (
            <li key={id}>
              <Link
                href={`/participante/${id}`}
                className="card flex h-full items-center gap-3 px-4 py-3 transition hover:border-primary/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
                  {p.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{p.entries.join(" · ")}</span>
                </span>
                {trophies.has(id) && <TrophyRow trophies={trophies.get(id)!} size={24} hideEmpty className="gap-1" />}
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
