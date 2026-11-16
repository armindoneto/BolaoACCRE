"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { entriesOpen, getCurrentBundle, isDemoMode, repo, type TokenAccess } from "@/lib/data";
import { hasDuplicate, validateEntry, type EntryPayload, type SaveResult } from "@/lib/entries";
import { createAuthClient } from "@/lib/supabase/server";

const CLOSED = "O prazo dos palpites já terminou.";

/** Quem está agindo: dono de um link pessoal ou usuário com conta. */
async function resolveAccess(token: string | null, editionId: string): Promise<TokenAccess | null> {
  if (token) {
    const access = await repo().getByToken(token);
    return access && access.editionId === editionId ? access : null;
  }
  const user = await getUser();
  return user ? repo().getByUser(user.id, editionId) : null;
}

/** Novo palpite (público). Com `token`, entra para o mesmo participante do link pessoal. */
export async function submitEntry(token: string | null, payload: EntryPayload): Promise<SaveResult> {
  const bundle = await getCurrentBundle();
  if (!bundle || !entriesOpen(bundle.edition)) return { ok: false, error: CLOSED };
  const user = await getUser();
  const access = await resolveAccess(token, bundle.edition.id);
  if (token && !access) return { ok: false, error: "Link pessoal não encontrado." };

  const valid = validateEntry(bundle, payload, !access);
  if (!valid.ok) return valid;
  if (!payload.confirmDuplicate && hasDuplicate(bundle, valid.entry.picks)) {
    return { ok: false, duplicate: true };
  }

  const created = await repo().createEntry({
    editionId: bundle.edition.id,
    participantName: access?.participantName ?? valid.entry.name,
    participantId: access?.participantId,
    userId: user?.id ?? null,
    nickname: valid.entry.nickname,
    picks: valid.entry.picks,
  });
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: `/meu/${created.token}?novo=1` };
}

/** Edita um palpite próprio (até o prazo). */
export async function updateOwnEntry(
  token: string | null,
  entryId: string,
  payload: EntryPayload,
): Promise<SaveResult> {
  const bundle = await getCurrentBundle();
  if (!bundle || !entriesOpen(bundle.edition)) return { ok: false, error: CLOSED };
  const access = await resolveAccess(token, bundle.edition.id);
  if (!access?.entries.some((e) => e.id === entryId)) {
    return { ok: false, error: "Palpite não encontrado." };
  }
  const valid = validateEntry(bundle, payload, false);
  if (!valid.ok) return valid;
  if (!payload.confirmDuplicate && hasDuplicate(bundle, valid.entry.picks, entryId)) {
    return { ok: false, duplicate: true };
  }
  await repo().updateEntry(entryId, { nickname: valid.entry.nickname, picks: valid.entry.picks });
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: token ? `/meu/${token}` : "/meus-palpites" };
}

export async function deleteOwnEntry(token: string | null, entryId: string): Promise<void> {
  const bundle = await getCurrentBundle();
  if (!bundle || !entriesOpen(bundle.edition)) throw new Error(CLOSED);
  const access = await resolveAccess(token, bundle.edition.id);
  if (!access?.entries.some((e) => e.id === entryId)) throw new Error("Palpite não encontrado.");
  await repo().deleteEntry(entryId);
  revalidatePath("/", "layout");
}

/** Guarda os palpites de um link pessoal na conta de quem está logado. */
export async function saveTokenToAccount(token: string): Promise<void> {
  const user = await getUser();
  if (!user) redirect(`/entrar?next=/meu/${token}`);
  await repo().linkTokenToUser(token, user.id);
  redirect("/meus-palpites");
}

export async function signOut(): Promise<void> {
  if (!isDemoMode()) {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
