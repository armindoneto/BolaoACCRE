"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { parseMatchesCsv } from "@/lib/csv";
import { repo, type EditionStatus, type ResultInput } from "@/lib/data";
import { normalizeName } from "@/lib/data/util";
import {
  cleanEntryName,
  hasDuplicate,
  nameTaken,
  validateEntry,
  type EntryPayload,
  type SaveResult,
} from "@/lib/entries";
import { parseBrDate } from "@/lib/csv";
import { parseRules } from "@/lib/scoring";
import { siteUrl } from "@/lib/site-url";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function refresh() {
  revalidatePath("/", "layout");
}

async function mustGetBundle(editionId: string) {
  const bundle = await repo().getBundle(editionId);
  if (!bundle) throw new Error("Edição não encontrada.");
  return bundle;
}

// ---------- Resultados ----------

export async function saveResults(editionId: string, results: ResultInput[]): Promise<ActionResult> {
  await requireAdmin();
  const bundle = await mustGetBundle(editionId);
  const known = new Set(bundle.matches.map((m) => m.id));
  for (const r of results) {
    if (!known.has(r.matchId)) return { ok: false, error: "Jogo não encontrado. Atualize a página." };
    const both = r.homeGoals !== null && r.awayGoals !== null;
    const none = r.homeGoals === null && r.awayGoals === null;
    if (!both && !none) return { ok: false, error: "Há um placar pela metade. Preencha os dois lados." };
    for (const g of [r.homeGoals, r.awayGoals]) {
      if (g !== null && (!Number.isInteger(g) || g < 0 || g > 99)) {
        return { ok: false, error: "Placar inválido." };
      }
    }
  }
  await repo().saveResults(editionId, results);
  refresh();
  return { ok: true, message: "Resultados salvos. Classificação atualizada." };
}

// ---------- Palpites ----------

const cleanName = (name: string) => name.trim().replace(/\s+/g, " ");

/** Participante escolhido no formulário: um já cadastrado, ou nenhum. */
async function chosenParticipant(
  participantId: string | null | undefined,
): Promise<{ id: string | null } | { error: string }> {
  if (!participantId) return { id: null };
  const found = await repo().getParticipant(participantId);
  return found ? { id: found.id } : { error: "Participante não encontrado. Atualize a página." };
}

export async function adminCreateEntry(editionId: string, payload: EntryPayload): Promise<SaveResult> {
  await requireAdmin();
  const bundle = await mustGetBundle(editionId);
  const valid = validateEntry(bundle, payload);
  if (!valid.ok) return valid;
  if (!payload.confirmDuplicate && hasDuplicate(bundle, valid.entry.picks)) return { ok: false, duplicate: true };
  const participant = await chosenParticipant(payload.participantId);
  if ("error" in participant) return { ok: false, error: participant.error };
  await repo().createEntry({
    editionId,
    name: valid.entry.name,
    participantId: participant.id,
    picks: valid.entry.picks,
  });
  refresh();
  return { ok: true, redirectTo: `/admin/palpites?edicao=${editionId}` };
}

export async function adminUpdateEntry(
  editionId: string,
  entryId: string,
  payload: EntryPayload,
): Promise<SaveResult> {
  await requireAdmin();
  const bundle = await mustGetBundle(editionId);
  if (!bundle.entries.some((e) => e.id === entryId)) return { ok: false, error: "Palpite não encontrado." };
  const valid = validateEntry(bundle, payload, entryId);
  if (!valid.ok) return valid;
  if (!payload.confirmDuplicate && hasDuplicate(bundle, valid.entry.picks, entryId)) {
    return { ok: false, duplicate: true };
  }
  const participant = await chosenParticipant(payload.participantId);
  if ("error" in participant) return { ok: false, error: participant.error };
  await repo().updateEntry(entryId, {
    name: valid.entry.name,
    picks: valid.entry.picks,
    participantId: participant.id,
  });
  refresh();
  return { ok: true, redirectTo: `/admin/palpites?edicao=${editionId}` };
}

/** Revisão rápida na lista: ajusta o nome do palpite e o participante, sem mexer nos times. */
export async function adminReviewEntry(
  editionId: string,
  entryId: string,
  rawName: string,
  participantId: string | null,
): Promise<ActionResult> {
  await requireAdmin();
  const bundle = await mustGetBundle(editionId);
  if (!bundle.entries.some((e) => e.id === entryId)) return { ok: false, error: "Palpite não encontrado." };
  const name = cleanEntryName(rawName);
  if (name.length < 2 || name.length > 40) return { ok: false, error: "O nome deve ter de 2 a 40 letras." };
  if (nameTaken(bundle, name, entryId)) return { ok: false, error: `Já existe um palpite chamado "${name}".` };
  const participant = await chosenParticipant(participantId);
  if ("error" in participant) return { ok: false, error: participant.error };
  await repo().updateEntry(entryId, { name, participantId: participant.id });
  refresh();
  return { ok: true, message: "Salvo." };
}

export async function adminDeleteEntry(entryId: string): Promise<void> {
  await requireAdmin();
  await repo().deleteEntry(entryId);
  refresh();
}

/** Link de edição de um palpite, para o admin repassar a quem palpitou. */
export async function adminEntryLink(entryId: string): Promise<string | null> {
  await requireAdmin();
  const token = await repo().getEntryToken(entryId);
  return token ? `${await siteUrl()}/meu/${token}` : null;
}

// ---------- Participantes ----------

export async function adminCreateParticipant(rawName: string): Promise<ActionResult> {
  await requireAdmin();
  const name = cleanName(rawName);
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Escreva o nome (de 2 a 60 letras)." };
  const same = (await repo().listParticipants()).find((p) => normalizeName(p.name) === normalizeName(name));
  if (same) return { ok: false, error: `Já existe um participante chamado "${same.name}".` };
  await repo().createParticipant(name);
  refresh();
  return { ok: true, message: `${name} cadastrado.` };
}

export async function adminRenameParticipant(participantId: string, rawName: string): Promise<ActionResult> {
  await requireAdmin();
  const name = cleanName(rawName);
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Escreva o nome (de 2 a 60 letras)." };
  const same = (await repo().listParticipants()).find(
    (p) => p.id !== participantId && normalizeName(p.name) === normalizeName(name),
  );
  if (same) return { ok: false, error: `Já existe outro participante chamado "${same.name}".` };
  await repo().renameParticipant(participantId, name);
  refresh();
  return { ok: true, message: "Nome alterado." };
}

export async function adminDeleteParticipant(participantId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await repo().deleteParticipant(participantId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não foi possível excluir." };
  }
  refresh();
  return { ok: true, message: "Participante excluído." };
}

// ---------- Jogos ----------

export async function importMatches(editionId: string, csv: string): Promise<ActionResult> {
  await requireAdmin();
  const bundle = await mustGetBundle(editionId);
  const { rows, errors } = parseMatchesCsv(csv, bundle.teams);
  if (errors.length > 0) {
    const shown = errors.slice(0, 8).join("\n");
    return { ok: false, error: errors.length > 8 ? `${shown}\n… e mais ${errors.length - 8} problemas.` : shown };
  }
  // Mantém resultados já lançados quando o CSV traz o mesmo jogo sem placar.
  const previous = new Map(
    bundle.matches.map((m) => [`${m.round}|${m.homeTeamId}|${m.awayTeamId}`, m]),
  );
  let kept = 0;
  for (const row of rows) {
    const old = previous.get(`${row.round}|${row.homeTeamId}|${row.awayTeamId}`);
    if (row.homeGoals === null && old && old.homeGoals !== null) {
      row.homeGoals = old.homeGoals;
      row.awayGoals = old.awayGoals;
      kept++;
    }
  }
  await repo().replaceMatches(editionId, rows);
  refresh();
  return {
    ok: true,
    message: `${rows.length} jogos importados${kept ? ` (${kept} resultados já lançados foram mantidos)` : ""}.`,
  };
}

// ---------- Edições ----------

const STATUSES: EditionStatus[] = ["draft", "open_for_entries", "running", "finished"];

export interface EditionForm {
  name: string;
  season: number;
  status: string;
  /** Valor do campo datetime-local (horário de Brasília) ou vazio. */
  deadline: string;
  prizesText: string;
  rulesJson: string;
  /** Uma linha por nível: "1: Flamengo, Palmeiras". */
  tiersText: string;
  /** turno -> nomes dos times, um por linha (opcional). */
  manualOrder: Record<string, string>;
}

export async function saveEdition(editionId: string, form: EditionForm): Promise<ActionResult> {
  await requireAdmin();
  const bundle = await mustGetBundle(editionId);

  const name = form.name.trim();
  if (!name) return { ok: false, error: "Dê um nome para a edição." };
  if (!Number.isInteger(form.season) || form.season < 1900 || form.season > 2200) {
    return { ok: false, error: "Temporada inválida." };
  }
  if (!STATUSES.includes(form.status as EditionStatus)) return { ok: false, error: "Situação inválida." };

  let json: unknown;
  try {
    json = JSON.parse(form.rulesJson);
  } catch {
    return { ok: false, error: "As regras não são um JSON válido." };
  }
  const parsed = parseRules(json);
  if (!parsed.ok) return { ok: false, error: `Regras inválidas:\n${parsed.errors.join("\n")}` };

  let deadline: string | null = null;
  if (form.deadline.trim()) {
    const iso = parseBrDate(form.deadline.trim());
    if (!iso) return { ok: false, error: "Prazo inválido." };
    deadline = iso;
  }

  // Níveis
  const tiers: { tier: number; teamNames: string[] }[] = [];
  for (const line of form.tiersText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = /^\s*(\d+)\s*[:;-]\s*(.+)$/.exec(line);
    if (!m) return { ok: false, error: `Linha de nível inválida: "${line.trim()}". Use "1: Time A, Time B".` };
    const teamNames = m[2].split(",").map((t) => t.trim()).filter(Boolean);
    if (teamNames.length < 2) return { ok: false, error: `O nível ${m[1]} precisa de pelo menos 2 times.` };
    tiers.push({ tier: Number(m[1]), teamNames });
  }
  const allNames = tiers.flatMap((t) => t.teamNames.map(normalizeName));
  if (new Set(allNames).size !== allNames.length) return { ok: false, error: "Há um time repetido nos níveis." };
  if (new Set(tiers.map((t) => t.tier)).size !== tiers.length) return { ok: false, error: "Há um nível repetido." };

  const currentTiers = new Map<number, string[]>();
  for (const t of bundle.teams) currentTiers.set(t.tier, [...(currentTiers.get(t.tier) ?? []), normalizeName(t.name)]);
  const known = new Map(bundle.teams.flatMap((t) => [[normalizeName(t.name), t], [normalizeName(t.shortName), t]] as const));
  const tiersChanged =
    tiers.length !== currentTiers.size ||
    tiers.some(({ tier, teamNames }) => {
      const now = (currentTiers.get(tier) ?? []).slice().sort();
      const next = teamNames.map((n) => normalizeName(known.get(normalizeName(n))?.name ?? n)).sort();
      return now.join("|") !== next.join("|");
    });
  if (tiersChanged && (bundle.entries.length > 0 || bundle.matches.length > 0)) {
    return {
      ok: false,
      error: "Os níveis não podem mudar depois que a edição já tem palpites ou jogos cadastrados.",
    };
  }

  await repo().updateEdition(editionId, {
    name,
    season: form.season,
    status: form.status as EditionStatus,
    rules: parsed.rules,
    entriesDeadline: deadline,
    prizesText: form.prizesText.trim() || null,
  });
  if (tiersChanged) await repo().setEditionTiers(editionId, tiers);

  // Ordem manual da tabela (desempates que o sistema não resolve)
  const fresh = await mustGetBundle(editionId);
  const index = new Map(
    fresh.teams.flatMap((t) => [t.name, t.shortName, t.code].map((k) => [normalizeName(k), t.id] as const)),
  );
  const manualStandingsOrder: Record<string, string[]> = {};
  for (const [periodId, text] of Object.entries(form.manualOrder)) {
    const ids: string[] = [];
    for (const line of text.split(/[\r\n,]+/)) {
      if (!line.trim()) continue;
      const id = index.get(normalizeName(line));
      if (!id) return { ok: false, error: `Ordem manual: time não encontrado "${line.trim()}".` };
      ids.push(id);
    }
    if (ids.length) manualStandingsOrder[periodId] = ids;
  }
  await repo().updateEdition(editionId, { manualStandingsOrder });

  refresh();
  return { ok: true, message: "Edição salva." };
}

export async function duplicateEdition(formData: FormData): Promise<void> {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const season = Number(formData.get("season"));
  if (!name || !Number.isInteger(season)) throw new Error("Informe o nome e a temporada da nova edição.");
  const id = await repo().duplicateEdition(sourceId, name, season);
  refresh();
  redirect(`/admin/edicoes/${id}`);
}

export async function deleteEdition(editionId: string): Promise<void> {
  await requireAdmin();
  const bundle = await mustGetBundle(editionId);
  if (bundle.edition.status !== "draft") throw new Error("Só é possível excluir edições em rascunho.");
  await repo().deleteEdition(editionId);
  refresh();
  redirect("/admin/edicoes");
}

// ---------- Times e escudos ----------

export interface TeamForm {
  name: string;
  shortName: string;
  code: string;
  color: string;
  color2: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function adminUpdateTeam(teamId: string, form: TeamForm): Promise<ActionResult> {
  await requireAdmin();
  const name = form.name.trim().replace(/\s+/g, " ");
  const shortName = form.shortName.trim().replace(/\s+/g, " ") || name;
  const code = form.code.trim().toUpperCase();
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Escreva o nome do time." };
  if (shortName.length > 24) return { ok: false, error: "O nome curto pode ter até 24 letras." };
  if (!/^[A-Z0-9]{2,4}$/.test(code)) return { ok: false, error: "A sigla deve ter de 2 a 4 letras." };
  if (!HEX.test(form.color) || !HEX.test(form.color2)) return { ok: false, error: "Cor inválida." };
  try {
    await repo().updateTeam(teamId, { name, shortName, code, color: form.color, color2: form.color2 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/duplicate|unique/i.test(message)) return { ok: false, error: "Já existe outro time com esse nome." };
    return { ok: false, error: "Não foi possível salvar o time." };
  }
  refresh();
  return { ok: true, message: "Time salvo." };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Recebe o escudo já reduzido pelo navegador (PNG pequeno) e guarda. */
export async function adminUploadCrest(teamId: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const file = formData.get("crest");
  if (!(file instanceof Blob)) return { ok: false, error: "Nenhuma imagem recebida." };
  if (file.size > 700 * 1024) return { ok: false, error: "A imagem ficou grande demais. Tente outra." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return { ok: false, error: "Imagem inválida." };
  try {
    await repo().setTeamCrest(teamId, bytes);
  } catch (e) {
    return {
      ok: false,
      error: `Não foi possível guardar o escudo${e instanceof Error ? `: ${e.message}` : "."}`,
    };
  }
  refresh();
  return { ok: true, message: "Escudo atualizado." };
}

export async function adminRemoveCrest(teamId: string): Promise<ActionResult> {
  await requireAdmin();
  await repo().removeTeamCrest(teamId);
  refresh();
  return { ok: true, message: "Escudo removido." };
}
