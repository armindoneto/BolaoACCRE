"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { entriesOpen, getCurrentBundle, isDemoMode, repo, type EditionBundle, type Entry } from "@/lib/data";
import { hasDuplicate, validateEntry, type EntryPayload, type SaveResult } from "@/lib/entries";
import { createAuthClient } from "@/lib/supabase/server";

const CLOSED = "O prazo dos palpites já terminou.";

/**
 * Novo palpite (público): só os times e um nome para o palpite. Ele entra sem
 * participante; o administrador revisa o nome e atribui depois.
 */
export async function submitEntry(payload: EntryPayload): Promise<SaveResult> {
  const bundle = await getCurrentBundle();
  if (!bundle || !entriesOpen(bundle.edition)) return { ok: false, error: CLOSED };
  const valid = validateEntry(bundle, payload);
  if (!valid.ok) return valid;
  if (!payload.confirmDuplicate && hasDuplicate(bundle, valid.entry.picks)) {
    return { ok: false, duplicate: true };
  }
  const created = await repo().createEntry({
    editionId: bundle.edition.id,
    name: valid.entry.name,
    participantId: null,
    picks: valid.entry.picks,
  });
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: `/meu/${created.token}?novo=1` };
}

/** Palpite de um link de edição, se ele for da edição atual e o prazo estiver aberto. */
async function editableEntry(
  token: string,
): Promise<{ error: string } | { bundle: EditionBundle; entry: Entry }> {
  const bundle = await getCurrentBundle();
  if (!bundle || !entriesOpen(bundle.edition)) return { error: CLOSED };
  const found = await repo().getEntryByToken(token);
  const entry = found && found.editionId === bundle.edition.id
    ? bundle.entries.find((e) => e.id === found.entryId)
    : undefined;
  if (!entry) return { error: "Palpite não encontrado." };
  return { bundle, entry };
}

/** Quem tem o link de edição pode mudar o nome e os times até o prazo. */
export async function updateOwnEntry(token: string, payload: EntryPayload): Promise<SaveResult> {
  const found = await editableEntry(token);
  if ("error" in found) return { ok: false, error: found.error };
  const { bundle, entry } = found;
  const valid = validateEntry(bundle, payload, entry.id);
  if (!valid.ok) return valid;
  if (!payload.confirmDuplicate && hasDuplicate(bundle, valid.entry.picks, entry.id)) {
    return { ok: false, duplicate: true };
  }
  await repo().updateEntry(entry.id, { name: valid.entry.name, picks: valid.entry.picks });
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: `/meu/${token}` };
}

export async function deleteOwnEntry(token: string): Promise<void> {
  const found = await editableEntry(token);
  if ("error" in found) throw new Error(found.error);
  await repo().deleteEntry(found.entry.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  if (!isDemoMode()) {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
