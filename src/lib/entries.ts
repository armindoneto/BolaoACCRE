import { selectionKey } from "@/lib/scoring";
import type { EditionBundle } from "@/lib/data";

export interface EntryPayload {
  name: string;
  nickname: string;
  picks: Record<number, string>;
  /** true quando a pessoa já viu o aviso de palpite repetido e quis manter. */
  confirmDuplicate: boolean;
}

export type SaveResult =
  | { ok: true; redirectTo?: string }
  | { ok: false; error: string }
  | { ok: false; duplicate: true };

export interface CleanEntry {
  name: string;
  nickname: string | null;
  picks: Record<number, string>;
}

/** Confere nome e escolhas: exatamente um time de cada nível, do nível certo. */
export function validateEntry(
  bundle: EditionBundle,
  payload: EntryPayload,
  requireName: boolean,
): { ok: true; entry: CleanEntry } | { ok: false; error: string } {
  const name = String(payload.name ?? "").trim().replace(/\s+/g, " ");
  if (requireName && (name.length < 2 || name.length > 60)) {
    return { ok: false, error: "Escreva seu nome (de 2 a 60 letras)." };
  }
  const nickname = String(payload.nickname ?? "").trim().replace(/\s+/g, " ").slice(0, 40) || null;
  const tiers = [...new Set(bundle.teams.map((t) => t.tier))].sort((a, b) => a - b);
  const picks: Record<number, string> = {};
  for (const tier of tiers) {
    const teamId = payload.picks?.[tier];
    const team = bundle.teams.find((t) => t.id === teamId && t.tier === tier);
    if (!team) return { ok: false, error: `Falta escolher o time do nível ${tier}.` };
    picks[tier] = team.id;
  }
  return { ok: true, entry: { name, nickname, picks } };
}

/** Já existe outro palpite com exatamente os mesmos times? */
export function hasDuplicate(
  bundle: EditionBundle,
  picks: Record<number, string>,
  ignoreEntryId?: string,
): boolean {
  const key = selectionKey(picks);
  return bundle.entries.some((e) => e.selectionKey === key && e.id !== ignoreEntryId);
}
