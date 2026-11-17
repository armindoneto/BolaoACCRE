import { randomUUID } from "node:crypto";
import { selectionKey } from "@/lib/scoring";
import { buildDemoBundles, DEMO_PARTICIPANTS } from "./demo";
import type { EditionBundle, Entry, EditionTeam, Repo } from "./types";
import { newToken, normalizeName, teamCodeFromName } from "./util";

/**
 * Repositório em memória, usado no MODO DEMONSTRAÇÃO (sem Supabase
 * configurado). Os dados somem quando o servidor reinicia.
 */
interface StoredParticipant {
  id: string;
  name: string;
  token: string;
  userId: string | null;
}

interface Store {
  bundles: Map<string, EditionBundle>;
  participants: Map<string, StoredParticipant>;
}

const g = globalThis as unknown as { __bolaoDemoStore2?: Store };

function store(): Store {
  if (!g.__bolaoDemoStore2) {
    g.__bolaoDemoStore2 = {
      bundles: new Map(buildDemoBundles().map((b) => [b.edition.id, b])),
      participants: new Map(
        DEMO_PARTICIPANTS.map((p) => [p.id, { ...p, token: newToken(), userId: null }]),
      ),
    };
  }
  return g.__bolaoDemoStore2;
}

const clone = <T>(value: T): T => structuredClone(value);

function allEntries(): Entry[] {
  return [...store().bundles.values()].flatMap((b) => b.entries);
}

function findEntry(entryId: string): { bundle: EditionBundle; entry: Entry } {
  for (const bundle of store().bundles.values()) {
    const entry = bundle.entries.find((e) => e.id === entryId);
    if (entry) return { bundle, entry };
  }
  throw new Error("Palpite não encontrado");
}

function mustParticipant(id: string): StoredParticipant {
  const p = store().participants.get(id);
  if (!p) throw new Error("Participante não encontrado");
  return p;
}

/** O mesmo time aparece copiado em cada edição; devolve todas as cópias. */
function teamCopies(teamId: string): EditionTeam[] {
  const copies = [...store().bundles.values()].flatMap((b) => b.teams.filter((t) => t.id === teamId));
  if (copies.length === 0) throw new Error("Time não encontrado");
  return copies;
}

const ref = (p: StoredParticipant | undefined) => (p ? { id: p.id, name: p.name } : null);

export const memoryRepo: Repo = {
  async listEditions() {
    return [...store().bundles.values()]
      .map((b) => clone(b.edition))
      .sort((a, b) => b.season - a.season || a.name.localeCompare(b.name));
  },

  async getBundle(editionId) {
    const bundle = store().bundles.get(editionId);
    return bundle ? clone(bundle) : null;
  },

  async saveResults(editionId, results) {
    const bundle = store().bundles.get(editionId);
    if (!bundle) throw new Error("Edição não encontrada");
    for (const r of results) {
      const match = bundle.matches.find((m) => m.id === r.matchId);
      if (!match) continue;
      match.homeGoals = r.homeGoals;
      match.awayGoals = r.awayGoals;
    }
  },

  async replaceMatches(editionId, rows) {
    const bundle = store().bundles.get(editionId);
    if (!bundle) throw new Error("Edição não encontrada");
    bundle.matches = rows.map((row) => ({ id: randomUUID(), ...row }));
  },

  async createEntry(input) {
    const bundle = store().bundles.get(input.editionId);
    if (!bundle) throw new Error("Edição não encontrada");
    const participant = mustParticipant(input.participantId);
    const entry: Entry = {
      id: randomUUID(),
      participantId: participant.id,
      participantName: participant.name,
      nickname: input.nickname,
      selectionKey: selectionKey(input.picks),
      picks: { ...input.picks },
      createdAt: new Date().toISOString(),
    };
    bundle.entries.push(entry);
    return clone(entry);
  },

  async updateEntry(entryId, patch) {
    const { entry } = findEntry(entryId);
    entry.nickname = patch.nickname;
    entry.picks = { ...patch.picks };
    entry.selectionKey = selectionKey(patch.picks);
    if (patch.participantId && patch.participantId !== entry.participantId) {
      const participant = mustParticipant(patch.participantId);
      entry.participantId = participant.id;
      entry.participantName = participant.name;
    }
  },

  async deleteEntry(entryId) {
    const { bundle } = findEntry(entryId);
    bundle.entries = bundle.entries.filter((e) => e.id !== entryId);
  },

  async listParticipants() {
    const counts = new Map<string, number>();
    for (const e of allEntries()) counts.set(e.participantId, (counts.get(e.participantId) ?? 0) + 1);
    return [...store().participants.values()]
      .map((p) => ({ id: p.id, name: p.name, hasAccount: p.userId !== null, entryCount: counts.get(p.id) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  async getParticipant(participantId) {
    return ref(store().participants.get(participantId));
  },

  async getParticipantByToken(token) {
    return ref([...store().participants.values()].find((p) => p.token === token));
  },

  async getParticipantByUser(userId) {
    return ref([...store().participants.values()].find((p) => p.userId === userId));
  },

  async getParticipantToken(participantId) {
    return store().participants.get(participantId)?.token ?? null;
  },

  async createParticipant(name, userId = null) {
    const p: StoredParticipant = { id: randomUUID(), name, token: newToken(), userId };
    store().participants.set(p.id, p);
    return { id: p.id, name: p.name, token: p.token };
  },

  async renameParticipant(participantId, name) {
    mustParticipant(participantId).name = name;
    for (const e of allEntries()) if (e.participantId === participantId) e.participantName = name;
  },

  async mergeParticipants(fromId, intoId) {
    const from = mustParticipant(fromId);
    const into = mustParticipant(intoId);
    for (const e of allEntries()) {
      if (e.participantId !== fromId) continue;
      e.participantId = into.id;
      e.participantName = into.name;
    }
    into.userId ??= from.userId;
    store().participants.delete(fromId);
  },

  async deleteParticipant(participantId) {
    if (allEntries().some((e) => e.participantId === participantId)) {
      throw new Error("Este participante ainda tem palpites.");
    }
    store().participants.delete(participantId);
  },

  async linkParticipantToUser(participantId, userId) {
    mustParticipant(participantId).userId = userId;
  },

  async updateEdition(editionId, patch) {
    const bundle = store().bundles.get(editionId);
    if (!bundle) throw new Error("Edição não encontrada");
    Object.assign(bundle.edition, clone(patch));
  },

  async setEditionTiers(editionId, tiers) {
    const s = store();
    const bundle = s.bundles.get(editionId);
    if (!bundle) throw new Error("Edição não encontrada");
    const known = [...s.bundles.values()].flatMap((b) => b.teams);
    bundle.teams = tiers.flatMap(({ tier, teamNames }) =>
      teamNames.map((name) => {
        const key = normalizeName(name);
        const found = known.find(
          (t) => normalizeName(t.name) === key || normalizeName(t.shortName) === key,
        );
        return found
          ? { ...found, tier }
          : {
              id: randomUUID(),
              name,
              shortName: name,
              code: teamCodeFromName(name),
              crestUrl: null,
              color: "#334155",
              color2: "#FFFFFF",
              tier,
            };
      }),
    );
  },

  async duplicateEdition(editionId, name, season) {
    const s = store();
    const source = s.bundles.get(editionId);
    if (!source) throw new Error("Edição não encontrada");
    const id = randomUUID();
    s.bundles.set(id, {
      edition: {
        ...clone(source.edition),
        id,
        name,
        season,
        status: "draft",
        entriesDeadline: null,
        manualStandingsOrder: {},
      },
      teams: clone(source.teams),
      matches: [],
      entries: [],
    });
    return id;
  },

  async deleteEdition(editionId) {
    store().bundles.delete(editionId);
  },

  async updateTeam(teamId, patch) {
    for (const team of teamCopies(teamId)) Object.assign(team, patch);
  },

  async setTeamCrest(teamId, png) {
    // Sem armazenamento de arquivos na demonstração: a imagem vai embutida no próprio endereço.
    const url = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
    for (const team of teamCopies(teamId)) team.crestUrl = url;
    return url;
  },

  async removeTeamCrest(teamId) {
    for (const team of teamCopies(teamId)) team.crestUrl = null;
  },

  async isAdmin() {
    return true;
  },
};
