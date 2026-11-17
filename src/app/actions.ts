"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { entriesOpen, getCurrentBundle, isDemoMode, repo, type ParticipantRef } from "@/lib/data";
import { hasDuplicate, validateEntry, type EntryPayload, type SaveResult } from "@/lib/entries";
import { createAuthClient } from "@/lib/supabase/server";

const CLOSED = "O prazo dos palpites já terminou.";

/** Quem está agindo: dono de um link pessoal ou usuário com conta. */
async function resolveParticipant(token: string | null): Promise<ParticipantRef | null> {
  if (token) return repo().getParticipantByToken(token);
  const user = await getUser();
  return user ? repo().getParticipantByUser(user.id) : null;
}

/** Novo palpite (público). Com `token`, entra para o participante dono do link pessoal. */
export async function submitEntry(token: string | null, payload: EntryPayload): Promise<SaveResult> {
  const bundle = await getCurrentBundle();
  if (!bundle || !entriesOpen(bundle.edition)) return { ok: false, error: CLOSED };
  const user = await getUser();
  const participant = await resolveParticipant(token);
  if (token && !participant) return { ok: false, error: "Link pessoal não encontrado." };

  const valid = validateEntry(bundle, payload, !participant);
  if (!valid.ok) return valid;
  if (!payload.confirmDuplicate && hasDuplicate(bundle, valid.entry.picks)) {
    return { ok: false, duplicate: true };
  }

  let participantId = participant?.id;
  let link = token;
  if (!participantId) {
    const created = await repo().createParticipant(valid.entry.name, user?.id ?? null);
    participantId = created.id;
    link = created.token;
  }
  link ??= await repo().getParticipantToken(participantId);
  await repo().createEntry({
    editionId: bundle.edition.id,
    participantId,
    nickname: valid.entry.nickname,
    picks: valid.entry.picks,
  });
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: link ? `/meu/${link}?novo=1` : "/meus-palpites" };
}

/** Edita um palpite próprio (até o prazo). */
export async function updateOwnEntry(
  token: string | null,
  entryId: string,
  payload: EntryPayload,
): Promise<SaveResult> {
  const bundle = await getCurrentBundle();
  if (!bundle || !entriesOpen(bundle.edition)) return { ok: false, error: CLOSED };
  const participant = await resolveParticipant(token);
  if (!participant || !bundle.entries.some((e) => e.id === entryId && e.participantId === participant.id)) {
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
  const participant = await resolveParticipant(token);
  if (!participant || !bundle.entries.some((e) => e.id === entryId && e.participantId === participant.id)) {
    throw new Error("Palpite não encontrado.");
  }
  await repo().deleteEntry(entryId);
  revalidatePath("/", "layout");
}

/** Guarda o cadastro de um link pessoal na conta de quem está logado. */
export async function saveTokenToAccount(token: string): Promise<void> {
  const user = await getUser();
  if (!user) redirect(`/entrar?next=/meu/${token}`);
  const participant = await repo().getParticipantByToken(token);
  if (participant) {
    const existing = await repo().getParticipantByUser(user.id);
    // Conta que já tinha cadastro: os palpites do link passam para ele.
    if (existing && existing.id !== participant.id) await repo().mergeParticipants(participant.id, existing.id);
    else await repo().linkParticipantToUser(participant.id, user.id);
    revalidatePath("/", "layout");
  }
  redirect("/meus-palpites");
}

export async function signOut(): Promise<void> {
  if (!isDemoMode()) {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
