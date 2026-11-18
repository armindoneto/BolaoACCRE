import { FileDown, FileUp, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/page-title";
import { repo } from "@/lib/data";
import { teamMap, tiersOf, toBadge } from "@/lib/view";
import { EditionHeader } from "../edition-header";
import { adminBundle } from "../shared";
import { ReviewRow } from "./review-row";

export default async function AdminPalpitesPage({ searchParams }: { searchParams: Promise<{ edicao?: string }> }) {
  const bundle = await adminBundle((await searchParams).edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const { edition } = bundle;
  const teams = teamMap(bundle);
  const tiers = tiersOf(bundle);
  const participants = (await repo().listParticipants()).map((p) => ({ id: p.id, name: p.name }));
  // Palpites com exatamente os mesmos times, agrupados pela chave dos times escolhidos.
  const sameTeams = new Map<string, string[]>();
  for (const e of bundle.entries) sameTeams.set(e.selectionKey, [...(sameTeams.get(e.selectionKey) ?? []), e.name]);
  // Primeiro os que aguardam revisão (sem participante), depois em ordem alfabética.
  const entries = [...bundle.entries].sort(
    (a, b) =>
      Number(a.participantId !== null) - Number(b.participantId !== null) ||
      a.name.localeCompare(b.name, "pt-BR", { numeric: true }),
  );
  const pending = entries.filter((e) => e.participantId === null).length;

  return (
    <div className="space-y-4">
      <EditionHeader edition={edition} title={`Palpites (${entries.length})`} />
      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <Link href={`/admin/palpites/novo?edicao=${edition.id}`} className="btn-primary min-h-12">
          <Plus className="size-4" /> Novo palpite
        </Link>
        <Link href={`/admin/exportar?edicao=${edition.id}`} className="btn-outline min-h-12">
          <FileDown className="size-4" /> Exportar em PDF
        </Link>
        {/* Ferramenta de uso único: apagar junto com a pasta palpites/importar. */}
        <Link href={`/admin/palpites/importar?edicao=${edition.id}`} className="btn-outline col-span-2 min-h-12">
          <FileUp className="size-4" /> Importar palpites
        </Link>
      </div>

      {pending > 0 ? (
        <p className="rounded-2xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          <strong>
            {pending} {pending === 1 ? "palpite aguarda" : "palpites aguardam"} revisão.
          </strong>{" "}
          Ajuste o nome se precisar, escolha o participante e toque em Salvar. Se a pessoa ainda não está na lista,
          cadastre-a na aba{" "}
          <Link href={`/admin/participantes?edicao=${edition.id}`} className="underline">Participantes</Link>.
        </p>
      ) : (
        entries.length > 0 && (
          <p className="text-sm text-muted">Todos os palpites já têm participante.</p>
        )
      )}

      {entries.length === 0 ? (
        <EmptyState title="Nenhum palpite ainda" />
      ) : (
        <ul className="grid items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <ReviewRow
                editionId={edition.id}
                entry={{ id: entry.id, name: entry.name, participantId: entry.participantId }}
                participants={participants}
                repeatedWith={(sameTeams.get(entry.selectionKey) ?? [])
                  .filter((name) => name !== entry.name)
                  .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))}
                badges={tiers.flatMap((tier) => {
                  const team = teams.get(entry.picks[tier]);
                  return team ? [toBadge(team)] : [];
                })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
