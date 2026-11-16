import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { EmptyState } from "@/components/page-title";
import { TeamBadge } from "@/components/team-badge";
import { teamMap, tiersOf } from "@/lib/view";
import { adminDeleteEntry } from "../actions";
import { EditionHeader } from "../edition-header";
import { adminBundle } from "../shared";
import { LinkButton } from "./link-button";

export default async function AdminPalpitesPage({ searchParams }: { searchParams: Promise<{ edicao?: string }> }) {
  const bundle = await adminBundle((await searchParams).edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const { edition } = bundle;
  const teams = teamMap(bundle);
  const tiers = tiersOf(bundle);
  const keyCount = new Map<string, number>();
  for (const e of bundle.entries) keyCount.set(e.selectionKey, (keyCount.get(e.selectionKey) ?? 0) + 1);
  const entries = [...bundle.entries].sort(
    (a, b) => a.participantName.localeCompare(b.participantName, "pt-BR") || a.createdAt.localeCompare(b.createdAt),
  );

  return (
    <div className="space-y-4">
      <EditionHeader edition={edition} title={`Palpites (${entries.length})`} />
      <div className="grid grid-cols-2 gap-2">
        <Link href={`/admin/palpites/novo?edicao=${edition.id}`} className="btn-primary min-h-12">
          <Plus className="size-4" /> Novo palpite
        </Link>
        <Link href={`/admin/exportar?edicao=${edition.id}`} className="btn-outline min-h-12">
          <FileDown className="size-4" /> Exportar em PDF
        </Link>
      </div>

      {entries.length === 0 ? (
        <EmptyState title="Nenhum palpite ainda" />
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.participantName}</p>
                  <p className="truncate text-xs text-muted">
                    {entry.nickname ?? "sem apelido"}
                    {(keyCount.get(entry.selectionKey) ?? 0) > 1 && (
                      <span className="chip ml-1.5 bg-warn-soft text-warn">palpite repetido</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <LinkButton entryId={entry.id} />
                  <Link
                    href={`/admin/palpites/${entry.id}?edicao=${edition.id}`}
                    aria-label="Editar"
                    className="btn-outline size-10 min-h-10 px-0"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <ConfirmButton
                    action={adminDeleteEntry.bind(null, entry.id)}
                    confirm={`Excluir o palpite de ${entry.participantName}?`}
                    className="btn-danger size-10 min-h-10 px-0"
                  >
                    <Trash2 className="size-4" />
                  </ConfirmButton>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {tiers.map((tier) => {
                  const team = teams.get(entry.picks[tier]);
                  return team ? <TeamBadge key={tier} team={team} size={24} /> : null;
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
