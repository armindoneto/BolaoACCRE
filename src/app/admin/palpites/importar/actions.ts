"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { normalizeName } from "@/lib/data/util";
import { selectionKey } from "@/lib/scoring";
import { parseEntriesImport } from "./parse";

export type EntriesImportResult =
  | { ok: false; errors: string[] }
  | {
      ok: true;
      saved: boolean;
      summary: {
        entries: number;
        participants: number;
        newParticipants: string[];
        withoutParticipant: string[];
        /** Grupos de palpites com exatamente os mesmos times (só aviso). */
        repeated: string[][];
      };
    };

/**
 * Importa de uma vez os palpites de uma edição (ferramenta de uso único).
 * Com `save = false` só confere e devolve um resumo.
 */
export async function importEntries(editionId: string, text: string, save: boolean): Promise<EntriesImportResult> {
  await requireAdmin();
  const bundle = await repo().getBundle(editionId);
  if (!bundle) return { ok: false, errors: ["Edição não encontrada."] };
  if (bundle.teams.length === 0) return { ok: false, errors: ["Esta edição ainda não tem times nos níveis."] };

  const { rows, errors } = parseEntriesImport({
    text,
    teams: bundle.teams,
    existingNames: bundle.entries.map((e) => e.name),
  });
  if (errors.length > 0) return { ok: false, errors };

  const known = new Map((await repo().listParticipants()).map((p) => [normalizeName(p.name), p]));
  // Um participante por nome (ignorando maiúsculas e acentos), com a grafia da primeira vez que aparece.
  const firstSpelling = new Map<string, string>();
  for (const r of rows) {
    if (r.participant && !firstSpelling.has(normalizeName(r.participant))) {
      firstSpelling.set(normalizeName(r.participant), r.participant);
    }
  }
  const names = [...firstSpelling.values()];
  const byKey = new Map<string, string[]>();
  for (const r of [...bundle.entries.map((e) => ({ name: e.name, picks: e.picks })), ...rows]) {
    const key = selectionKey(r.picks);
    byKey.set(key, [...(byKey.get(key) ?? []), r.name]);
  }
  const summary = {
    entries: rows.length,
    participants: names.length,
    newParticipants: names.filter((n) => !known.has(normalizeName(n))),
    withoutParticipant: rows.filter((r) => !r.participant).map((r) => r.name),
    repeated: [...byKey.values()].filter((group) => group.length > 1 && group.some((n) => rows.some((r) => r.name === n))),
  };
  if (!save) return { ok: true, saved: false, summary };

  const participantId = new Map<string, string>();
  for (const name of names) {
    const key = normalizeName(name);
    participantId.set(key, known.get(key)?.id ?? (await repo().createParticipant(name)).id);
  }
  await repo().createEntries(
    rows.map((r) => ({
      editionId,
      name: r.name,
      participantId: r.participant ? participantId.get(normalizeName(r.participant))! : null,
      picks: r.picks,
    })),
  );
  revalidatePath("/", "layout");
  return { ok: true, saved: true, summary };
}
