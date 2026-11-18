"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { parseMatchesCsv } from "@/lib/csv";
import { repo, type EditionStatus, type ResultInput } from "@/lib/data";
import { normalizeName, teamCodeFromName } from "@/lib/data/util";
import { tiersOf } from "@/lib/view";
import {
  cleanEntryName,
  hasDuplicate,
  nameTaken,
  validateEntry,
  type EntryPayload,
  type SaveResult,
} from "@/lib/entries";
import { parseBrDate } from "@/lib/csv";
import { parseHistory } from "@/lib/history-import";
import { buildImportedResult, formatPoints, parseRules, type Rules } from "@/lib/scoring";

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
  /** Times de cada nível, escolhidos do cadastro geral. */
  tiers: { tier: number; teamIds: string[] }[];
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

  // Níveis (os times vêm do cadastro geral)
  const catalog = new Set((await repo().listTeams()).map((t) => t.id));
  const tiers = form.tiers.map((t) => ({ tier: t.tier, teamIds: t.teamIds.filter(Boolean) }));
  for (const t of tiers) {
    if (!Number.isInteger(t.tier) || t.tier < 1) return { ok: false, error: "Nível inválido." };
    if (t.teamIds.length === 0) {
      return { ok: false, error: `O nível ${t.tier} está vazio. Escolha os times ou remova o nível.` };
    }
    if (t.teamIds.length < 2) return { ok: false, error: `O nível ${t.tier} precisa de pelo menos 2 times.` };
    if (t.teamIds.some((id) => !catalog.has(id))) return { ok: false, error: "Um dos times não existe mais. Atualize a página." };
  }
  const allIds = tiers.flatMap((t) => t.teamIds);
  if (new Set(allIds).size !== allIds.length) return { ok: false, error: "Há um time repetido nos níveis." };
  if (new Set(tiers.map((t) => t.tier)).size !== tiers.length) return { ok: false, error: "Há um nível repetido." };

  const signature = (list: { tier: number; teamIds: string[] }[]) =>
    list
      .map((t) => `${t.tier}:${[...t.teamIds].sort().join(",")}`)
      .sort()
      .join("|");
  const current = tiersOf(bundle).map((tier) => ({
    tier,
    teamIds: bundle.teams.filter((t) => t.tier === tier).map((t) => t.id),
  }));
  const tiersChanged = signature(tiers) !== signature(current);
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
  // O desempate por nível precisa citar os níveis que a edição tem de verdade.
  const tierNumbers = tiers.map((t) => t.tier).sort((a, b) => a - b);
  const sequence = parsed.rules.tiebreakers.find((tb) => tb.type === "tier_points_sequence");
  const covered = sequence && sequence.type === "tier_points_sequence" ? sequence.tiers : [];
  const missing = tierNumbers.filter((n) => !covered.includes(n));
  if (sequence && missing.length > 0) {
    return {
      ok: true,
      message: `Edição salva. Atenção: o desempate nas regras não inclui ${missing.length === 1 ? "o nível" : "os níveis"} ${missing.join(", ")}. Ajuste "tier_points_sequence" no JSON das regras.`,
    };
  }
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
  if (bundle.edition.status !== "draft" && !bundle.edition.importedResults) {
    throw new Error("Só é possível excluir rascunhos e edições importadas.");
  }
  await repo().deleteEdition(editionId);
  refresh();
  redirect("/admin/edicoes");
}

/** Passa a edição para outro estado: palpites abertos, em andamento ou encerrada. */
export async function setEditionStatus(editionId: string, status: EditionStatus): Promise<void> {
  await requireAdmin();
  if (!STATUSES.includes(status)) throw new Error("Situação inválida.");
  await mustGetBundle(editionId);
  await repo().updateEdition(editionId, { status });
  refresh();
}

// ---------- Importação de bolões antigos ----------

export interface HistoryImportForm {
  name: string;
  season: number;
  /** Nomes das etapas, separados por vírgula. */
  periods: string;
  /** Uma linha por nível: "1: Flamengo, Palmeiras". */
  tiersText: string;
  /** Lançamentos de cada time, com linhas de etapa e de time. */
  pointsText: string;
  entriesText: string;
}

export type HistoryImportResult =
  | { ok: false; errors: string[] }
  | {
      ok: true;
      saved: boolean;
      editionId?: string;
      summary: {
        teams: number;
        tiers: number;
        entries: number;
        participants: string[];
        newParticipants: string[];
        newTeams: string[];
        warnings: string[];
        periods: { name: string; top: string[]; last: string[]; usesPositions: boolean }[];
      };
    };

/**
 * Importa um bolão antigo colado da planilha. Com `save = false` só confere os
 * dados e devolve um resumo; com `save = true` grava a edição como encerrada.
 */
export async function importHistoricEdition(form: HistoryImportForm, save: boolean): Promise<HistoryImportResult> {
  await requireAdmin();
  const name = form.name.trim();
  const errors: string[] = [];
  if (!name) errors.push("Dê um nome para a edição (ex.: Brasileirão 2023).");
  if (!Number.isInteger(form.season) || form.season < 1900 || form.season > 2200) errors.push("Temporada inválida.");
  const editions = await repo().listEditions();
  if (editions.some((e) => normalizeName(e.name) === normalizeName(name))) {
    errors.push(`Já existe uma edição chamada "${name}".`);
  }

  // Times do cadastro geral, pelo nome, nome curto ou sigla: a planilha pode usar qualquer um.
  const catalog = await repo().listTeams();
  const aliases: Record<string, string> = {};
  for (const team of catalog) {
    aliases[team.shortName] = team.name;
    aliases[team.code] = team.name;
  }
  const catalogByName = new Map(catalog.map((t) => [normalizeName(t.name), t]));
  const parsed = parseHistory({
    periodNames: form.periods.split(","),
    tiersText: form.tiersText,
    pointsText: form.pointsText,
    entriesText: form.entriesText,
    aliases,
  });
  if (!parsed.ok) return { ok: false, errors: [...errors, ...parsed.errors] };
  if (errors.length > 0) return { ok: false, errors };
  const { data } = parsed;

  const rules: Rules = {
    periods: data.periods.map((periodName, i) => ({ id: `E${i + 1}`, name: periodName, rounds: [i + 1, i + 1] })),
    matchRules: [],
    periodEndRules: [],
    tiebreakers: [{ type: "total_points" }, { type: "tier_points_sequence", tiers: data.tiers.map((t) => t.tier) }],
    fullTieBehavior: "share_position",
    prizes: { scope: "per_period", positions: [1, 2, 3, "last"], ranking: "dense", tieBehavior: "split" },
  };

  // Monta o resultado usando os nomes como ids, só para o resumo e a conferência.
  const preview = buildImportedResult({
    rules,
    teams: data.tiers.flatMap((t) => t.teamNames.map((teamName) => ({ id: teamName, tier: t.tier }))),
    entries: data.entries.map((e) => ({ id: e.name, picks: e.picks })),
    imported: {
      periods: data.periods.map((_, p) => ({
        id: `E${p + 1}`,
        teamScores: Object.fromEntries(data.teamScores[p]),
        positions: data.entries.every((e) => e.positions[p] !== undefined)
          ? Object.fromEntries(data.entries.map((e) => [e.name, e.positions[p]!]))
          : undefined,
      })),
    },
  });
  const known = await repo().listParticipants();
  const knownByName = new Map(known.map((p) => [normalizeName(p.name), p]));
  const participantNames = [...new Set(data.entries.flatMap((e) => (e.participant ? [e.participant] : [])))];
  const summary = {
    teams: data.tiers.reduce((sum, t) => sum + t.teamNames.length, 0),
    tiers: data.tiers.length,
    entries: data.entries.length,
    participants: participantNames,
    newParticipants: participantNames.filter((n) => !knownByName.has(normalizeName(n))),
    newTeams: data.tiers.flatMap((t) => t.teamNames).filter((n) => !catalogByName.has(normalizeName(n))),
    warnings: data.warnings,
    periods: preview.periods.map((period, p) => {
      const lastPosition = Math.max(...period.ranking.map((r) => r.position));
      const line = (r: (typeof period.ranking)[number]) => `${r.position}º ${r.entryId} (${formatPoints(r.tenths)} pts)`;
      return {
        name: period.period.name,
        top: period.ranking.filter((r) => r.position <= 3).map(line),
        last: period.ranking.filter((r) => r.position === lastPosition && r.position > 3).map(line),
        usesPositions: data.entries.every((e) => e.positions[p] !== undefined),
      };
    }),
  };
  if (!save) return { ok: true, saved: false, summary };

  const editionId = await repo().createEdition({ name, season: form.season, status: "finished", rules });
  try {
    // Times: usa os do cadastro e cadastra os que faltam.
    const teamId = new Map<string, string>();
    const codes = new Set(catalog.map((t) => t.code));
    for (const teamName of data.tiers.flatMap((t) => t.teamNames)) {
      const key = normalizeName(teamName);
      const existing = catalogByName.get(key);
      if (existing) {
        teamId.set(key, existing.id);
        continue;
      }
      const code = freeTeamCode(teamName, codes);
      codes.add(code);
      const created = await repo().createTeam({
        name: teamName,
        shortName: teamName.length <= 24 ? teamName : teamName.slice(0, 24),
        code,
        color: "#334155",
        color2: "#FFFFFF",
      });
      teamId.set(key, created.id);
    }
    await repo().setEditionTiers(
      editionId,
      data.tiers.map((t) => ({ tier: t.tier, teamIds: t.teamNames.map((n) => teamId.get(normalizeName(n))!) })),
    );
    const idOf = (teamName: string) => {
      const id = teamId.get(normalizeName(teamName));
      if (!id) throw new Error(`Time não encontrado depois de gravar: ${teamName}`);
      return id;
    };
    // Participantes: usa os já cadastrados e cria os que faltam.
    const participantId = new Map<string, string>();
    for (const participantName of participantNames) {
      const key = normalizeName(participantName);
      const existing = knownByName.get(key);
      participantId.set(key, existing ? existing.id : (await repo().createParticipant(participantName)).id);
    }
    const entryIds = await repo().createEntries(
      data.entries.map((e) => ({
        editionId,
        name: e.name,
        participantId: e.participant ? participantId.get(normalizeName(e.participant))! : null,
        picks: Object.fromEntries(Object.entries(e.picks).map(([tier, teamName]) => [tier, idOf(teamName)])),
      })),
    );
    await repo().updateEdition(editionId, {
      importedResults: {
        periods: data.periods.map((_, p) => ({
          id: `E${p + 1}`,
          teamScores: Object.fromEntries([...data.teamScores[p]].map(([teamName, score]) => [idOf(teamName), score])),
          positions: data.entries.every((e) => e.positions[p] !== undefined)
            ? Object.fromEntries(data.entries.map((e, i) => [entryIds[i], e.positions[p]!]))
            : undefined,
        })),
      },
    });
  } catch (e) {
    // Não deixa uma edição pela metade no histórico.
    await repo().deleteEdition(editionId).catch(() => {});
    return { ok: false, errors: [`Não foi possível gravar: ${e instanceof Error ? e.message : "erro desconhecido"}`] };
  }
  refresh();
  return { ok: true, saved: true, editionId, summary };
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

/** Sigla livre no cadastro: a gerada pelo nome ou, se já existir, com um número no fim. */
function freeTeamCode(name: string, taken: Set<string>): string {
  const base = teamCodeFromName(name).slice(0, 3);
  if (!taken.has(base)) return base;
  for (let n = 2; n <= 9; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
  return base;
}

/** Confere os dados de um time contra o cadastro (nome e sigla não podem se repetir). */
async function cleanTeam(form: TeamForm, ignoreId?: string): Promise<{ team: TeamForm } | { error: string }> {
  const name = form.name.trim().replace(/\s+/g, " ");
  const shortName = form.shortName.trim().replace(/\s+/g, " ") || name;
  const code = form.code.trim().toUpperCase();
  if (name.length < 2 || name.length > 60) return { error: "Escreva o nome do time." };
  if (shortName.length > 24) return { error: "O nome curto pode ter até 24 letras." };
  if (!/^[A-Z0-9]{2,4}$/.test(code)) return { error: "A sigla deve ter de 2 a 4 letras." };
  if (!HEX.test(form.color) || !HEX.test(form.color2)) return { error: "Cor inválida." };
  const others = (await repo().listTeams()).filter((t) => t.id !== ignoreId);
  const sameName = others.find((t) => normalizeName(t.name) === normalizeName(name));
  if (sameName) return { error: `Já existe um time chamado "${sameName.name}".` };
  const sameCode = others.find((t) => t.code === code);
  if (sameCode) return { error: `A sigla ${code} já é do ${sameCode.name}.` };
  return { team: { name, shortName, code, color: form.color, color2: form.color2 } };
}

export async function adminCreateTeam(form: TeamForm): Promise<ActionResult> {
  await requireAdmin();
  const clean = await cleanTeam(form);
  if ("error" in clean) return { ok: false, error: clean.error };
  await repo().createTeam(clean.team);
  refresh();
  return { ok: true, message: `${clean.team.name} cadastrado.` };
}

export async function adminUpdateTeam(teamId: string, form: TeamForm): Promise<ActionResult> {
  await requireAdmin();
  const clean = await cleanTeam(form, teamId);
  if ("error" in clean) return { ok: false, error: clean.error };
  try {
    await repo().updateTeam(teamId, clean.team);
  } catch {
    return { ok: false, error: "Não foi possível salvar o time." };
  }
  refresh();
  return { ok: true, message: "Time salvo." };
}

export async function adminDeleteTeam(teamId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await repo().deleteTeam(teamId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não foi possível excluir." };
  }
  refresh();
  return { ok: true, message: "Time excluído." };
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
