"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { entriesOpen, getCurrentBundle, isDemoMode, repo } from "@/lib/data";
import { hasDuplicate, validateEntry, type EntryPayload, type SaveResult } from "@/lib/entries";
import { createAuthClient } from "@/lib/supabase/server";

const CLOSED = "O prazo dos palpites já terminou.";

/**
 * Novo palpite (público): só os times e um nome para o palpite. Ele entra sem
 * participante; o administrador revisa o nome e atribui depois. Depois de
 * enviado, só o administrador altera ou exclui.
 */
export async function submitEntry(payload: EntryPayload): Promise<SaveResult> {
  const bundle = await getCurrentBundle();
  if (!bundle || !entriesOpen(bundle.edition)) return { ok: false, error: CLOSED };
  const valid = validateEntry(bundle, payload);
  if (!valid.ok) return valid;
  if (!payload.confirmDuplicate && hasDuplicate(bundle, valid.entry.picks)) {
    return { ok: false, duplicate: true };
  }
  const entry = await repo().createEntry({
    editionId: bundle.edition.id,
    name: valid.entry.name,
    participantId: null,
    picks: valid.entry.picks,
  });
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: `/palpite/enviado?nome=${encodeURIComponent(entry.name)}` };
}

export async function signOut(): Promise<void> {
  if (!isDemoMode()) {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
