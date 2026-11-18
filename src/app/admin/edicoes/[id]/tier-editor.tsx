"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { TeamBadge, type BadgeTeam } from "@/components/team-badge";

export type CatalogOption = BadgeTeam & { id: string; shortName: string };

export type TierValue = { tier: number; teamIds: string[] };

/**
 * Times de cada nível, escolhidos do cadastro geral de times. Cada time só
 * pode estar em um nível.
 */
export function TierEditor({
  catalog,
  value,
  onChange,
  locked,
}: {
  catalog: CatalogOption[];
  value: TierValue[];
  onChange: (value: TierValue[]) => void;
  locked: boolean;
}) {
  const byId = new Map(catalog.map((t) => [t.id, t]));
  const used = new Set(value.flatMap((t) => t.teamIds));
  const available = catalog.filter((t) => !used.has(t.id));
  const update = (index: number, teamIds: string[]) =>
    onChange(value.map((t, i) => (i === index ? { ...t, teamIds } : t)));
  // Os níveis são sempre 1, 2, 3...: remover um renumera os seguintes.
  const renumber = (list: TierValue[]) => list.map((t, i) => ({ ...t, tier: i + 1 }));

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {value.map((t, index) => (
          <li key={t.tier} className="rounded-xl border border-border p-2">
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs font-bold uppercase text-muted">Nível {t.tier}</span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {t.teamIds.map((id) => {
                  const team = byId.get(id);
                  if (!team) return null;
                  return (
                    <span key={id} className="chip gap-1.5 bg-border/60 py-1 pr-1 pl-1.5 text-sm text-fg">
                      <TeamBadge team={team} size={18} />
                      {team.shortName}
                      {!locked && (
                        <button
                          type="button"
                          aria-label={`Tirar ${team.name} do nível ${t.tier}`}
                          className="cursor-pointer rounded-full p-0.5 text-muted hover:bg-danger/10 hover:text-danger"
                          onClick={() => update(index, t.teamIds.filter((x) => x !== id))}
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </span>
                  );
                })}
                {t.teamIds.length === 0 && <span className="text-sm text-muted">Nenhum time ainda</span>}
              </div>
              {!locked && (
                <button
                  type="button"
                  aria-label={`Remover o nível ${t.tier}`}
                  title="Remover este nível"
                  className="cursor-pointer rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                  onClick={() => onChange(renumber(value.filter((_, i) => i !== index)))}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {!locked && (
              <select
                aria-label={`Adicionar time ao nível ${t.tier}`}
                className="input mt-2 min-h-10 text-sm"
                value=""
                onChange={(e) => e.target.value && update(index, [...t.teamIds, e.target.value])}
              >
                <option value="">+ Adicionar time ao nível {t.tier}…</option>
                {available.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            )}
          </li>
        ))}
      </ul>
      {!locked && (
        <button
          type="button"
          className="btn-outline min-h-10 w-full"
          onClick={() => onChange([...value, { tier: value.length + 1, teamIds: [] }])}
        >
          <Plus className="size-4" /> Adicionar nível
        </button>
      )}
      <p className="text-xs text-muted">
        {locked ? (
          "Esta edição já tem jogos ou palpites, então os níveis estão travados."
        ) : (
          <>
            Os times vêm do cadastro geral. Falta algum? Cadastre na aba{" "}
            <Link href="/admin/times" className="font-semibold text-primary">Times</Link> e volte aqui.
          </>
        )}
      </p>
    </div>
  );
}
