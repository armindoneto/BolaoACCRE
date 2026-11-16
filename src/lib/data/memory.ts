import { randomUUID } from "node:crypto";
import { selectionKey } from "@/lib/scoring";
import { buildDemoBundle } from "./demo";
import type { EditionBundle, Entry, Repo, TokenAccess } from "./types";
import { newToken, normalizeName, teamCodeFromName } from "./util";

/**
 * Repositório em memória, usado no MODO DEMONSTRAÇÃO (sem Supabase
 * configurado). Os dados somem quando o servidor reinicia.
 */
interface Store {
  bundles: Map<string, EditionBundle>;
  /** id do participante -> token do link pessoal */
  tokens: Map<string, string>;
  /** id do participante -> id do usuário */
  users: Map<string, string>;
}

const g = globalThis as unknown as { __bolaoDemoStore?: Store };

function store(): Store {
  if (!g.__bolaoDemoStore) {
    const demo = buildDemoBundle();
    g.__bolaoDemoStore = {
      bundles: new Map([[demo.edition.id, demo]]),
      tokens: new Map(),
      users: new Map(),
    };
  }
  return g.__bolaoDemoStore;
}

const clone = <T>(value: T): T => structuredClone(value);

function findEntry(entryId: string): { bundle: EditionBundle; entry: Entry } {
  for (const bundle of store().bundles.values()) {
    const entry = bundle.entries.find((e) => e.id === entryId);
    if (entry) return { bundle, entry };
  }
  throw new Error("Palpite não encontrado");
}

/** O mesmo time aparece copiado em cada edição; devolve todas as cópias. */
function teamCopies(teamId: string) {
  const copies = [...store().bundles.values()].flatMap((b) => b.teams.filter((t) => t.id === teamId));
  if (copies.length === 0) throw new Error("Time não encontrado");
  return copies;
}

function tokenFor(participantId: string): string {
  const s = store();
  let token = s.tokens.get(participantId);
  if (!token) {
    token = newToken();
    s.tokens.set(participantId, token);
  }
  return token;
}

function access(participantId: string, bundle: EditionBundle): TokenAccess | null {
  const entries = bundle.entries.filter((e) => e.participantId === participantId);
  if (entries.length === 0) return null;
  return {
    token: tokenFor(participantId),
    editionId: bundle.edition.id,
    participantId,
    participantName: entries[0].participantName,
    entries: clone(entries),
  };
}

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
    const s = store();
    let participantId = input.participantId;
    if (!participantId && input.userId) {
      participantId = [...s.users.entries()].find(([, userId]) => userId === input.userId)?.[0];
    }
    const existing = participantId
      ? bundle.entries.find((e) => e.participantId === participantId)
      : undefined;
    participantId ??= randomUUID();
    if (input.userId) s.users.set(participantId, input.userId);
    const entry: Entry = {
      id: randomUUID(),
      participantId,
      participantName: existing?.participantName ?? input.participantName,
      nickname: input.nickname,
      selectionKey: selectionKey(input.picks),
      picks: { ...input.picks },
      createdAt: new Date().toISOString(),
    };
    bundle.entries.push(entry);
    return { entry: clone(entry), token: tokenFor(participantId) };
  },

  async updateEntry(entryId, patch) {
    const { bundle, entry } = findEntry(entryId);
    entry.nickname = patch.nickname;
    entry.picks = { ...patch.picks };
    entry.selectionKey = selectionKey(patch.picks);
    if (patch.participantName) {
      for (const e of bundle.entries) {
        if (e.participantId === entry.participantId) e.participantName = patch.participantName;
      }
    }
  },

  async deleteEntry(entryId) {
    const { bundle } = findEntry(entryId);
    bundle.entries = bundle.entries.filter((e) => e.id !== entryId);
  },

  async getEntryToken(entryId) {
    return tokenFor(findEntry(entryId).entry.participantId);
  },

  async getByToken(token) {
    const s = store();
    const participantId = [...s.tokens.entries()].find(([, t]) => t === token)?.[0];
    if (!participantId) return null;
    for (const bundle of s.bundles.values()) {
      const found = access(participantId, bundle);
      if (found) return found;
    }
    return null;
  },

  async getByUser(userId, editionId) {
    const s = store();
    const bundle = s.bundles.get(editionId);
    const participantId = [...s.users.entries()].find(([, u]) => u === userId)?.[0];
    if (!bundle || !participantId) return null;
    return access(participantId, bundle);
  },

  async linkTokenToUser(token, userId) {
    const s = store();
    const participantId = [...s.tokens.entries()].find(([, t]) => t === token)?.[0];
    if (participantId) s.users.set(participantId, userId);
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
