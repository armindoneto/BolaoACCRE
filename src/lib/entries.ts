import { selectionKey } from "@/lib/scoring";
import type { EditionBundle } from "@/lib/data";
import { normalizeName } from "@/lib/data/util";

export interface EntryPayload {
  /** Nome do palpite. */
  name: string;
  /** Só no admin: participante dono do palpite ("" ou null = sem participante). */
  participantId?: string | null;
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
  picks: Record<number, string>;
}

export function cleanEntryName(name: unknown): string {
  return String(name ?? "").trim().replace(/\s+/g, " ");
}

/** Outro palpite da edição já usa esse nome? (ignora maiúsculas e acentos) */
export function nameTaken(bundle: EditionBundle, name: string, ignoreEntryId?: string): boolean {
  const key = normalizeName(name);
  return bundle.entries.some((e) => e.id !== ignoreEntryId && normalizeName(e.name) === key);
}

/** Confere o nome do palpite e as escolhas: exatamente um time de cada nível, do nível certo. */
export function validateEntry(
  bundle: EditionBundle,
  payload: EntryPayload,
  ignoreEntryId?: string,
): { ok: true; entry: CleanEntry } | { ok: false; error: string } {
  const name = cleanEntryName(payload.name);
  if (name.length < 2 || name.length > 40) {
    return { ok: false, error: "Dê um nome ao palpite (de 2 a 40 letras)." };
  }
  if (nameTaken(bundle, name, ignoreEntryId)) {
    return { ok: false, error: `Já existe um palpite chamado "${name}". Escolha outro nome.` };
  }
  const tiers = [...new Set(bundle.teams.map((t) => t.tier))].sort((a, b) => a - b);
  const picks: Record<number, string> = {};
  for (const tier of tiers) {
    const teamId = payload.picks?.[tier];
    const team = bundle.teams.find((t) => t.id === teamId && t.tier === tier);
    if (!team) return { ok: false, error: `Falta escolher o time do nível ${tier}.` };
    picks[tier] = team.id;
  }
  return { ok: true, entry: { name, picks } };
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
