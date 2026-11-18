import { randomUUID } from "node:crypto";
import { selectionKey } from "@/lib/scoring";
import { buildDemoBundles, DEMO_PARTICIPANTS, DEMO_TEAM_CATALOG } from "./demo";
import type { EditionBundle, Entry, Repo, Team } from "./types";

/**
 * Repositório em memória, usado no MODO DEMONSTRAÇÃO (sem Supabase
 * configurado). Os dados somem quando o servidor reinicia.
 */
interface StoredParticipant {
  id: string;
  name: string;
}

interface Store {
  bundles: Map<string, EditionBundle>;
  participants: Map<string, StoredParticipant>;
  /** Cadastro geral de times. As edições guardam só id e nível; os dados vêm daqui. */
  teams: Map<string, Team>;
}

const g = globalThis as unknown as { __bolaoDemoStore4?: Store };

function store(): Store {
  if (!g.__bolaoDemoStore4) {
    g.__bolaoDemoStore4 = {
      bundles: new Map(buildDemoBundles().map((b) => [b.edition.id, b])),
      participants: new Map(DEMO_PARTICIPANTS.map((p) => [p.id, { ...p }])),
      teams: new Map(DEMO_TEAM_CATALOG.map((t) => [t.id, { ...t }])),
    };
  }
  return g.__bolaoDemoStore4;
}

function mustTeam(teamId: string): Team {
  const team = store().teams.get(teamId);
  if (!team) throw new Error("Time não encontrado");
  return team;
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

const ref = (p: StoredParticipant | undefined) => (p ? { id: p.id, name: p.name } : null);

export const memoryRepo: Repo = {
  async listEditions() {
    return [...store().bundles.values()]
      .map((b) => clone(b.edition))
      .sort((a, b) => b.season - a.season || a.name.localeCompare(b.name));
  },

  async getBundle(editionId) {
    const bundle = store().bundles.get(editionId);
    if (!bundle) return null;
    const copy = clone(bundle);
    // Os dados de cada time (nome, escudo, cores) vêm sempre do cadastro geral.
    copy.teams = copy.teams.map((t) => ({ ...clone(mustTeam(t.id)), tier: t.tier }));
    return copy;
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
    const participant = input.participantId ? mustParticipant(input.participantId) : null;
    const entry: Entry = {
      id: randomUUID(),
      name: input.name,
      participantId: participant?.id ?? null,
      participantName: participant?.name ?? null,
      selectionKey: selectionKey(input.picks),
      picks: { ...input.picks },
      createdAt: new Date().toISOString(),
    };
    bundle.entries.push(entry);
    return clone(entry);
  },

  async createEntries(inputs) {
    const ids: string[] = [];
    for (const input of inputs) ids.push((await memoryRepo.createEntry(input)).id);
    return ids;
  },

  async updateEntry(entryId, patch) {
    const { entry } = findEntry(entryId);
    if (patch.name !== undefined) entry.name = patch.name;
    if (patch.picks) {
      entry.picks = { ...patch.picks };
      entry.selectionKey = selectionKey(patch.picks);
    }
    if (patch.participantId !== undefined) {
      const participant = patch.participantId ? mustParticipant(patch.participantId) : null;
      entry.participantId = participant?.id ?? null;
      entry.participantName = participant?.name ?? null;
    }
  },

  async deleteEntry(entryId) {
    const { bundle } = findEntry(entryId);
    bundle.entries = bundle.entries.filter((e) => e.id !== entryId);
  },

  async listParticipants() {
    const counts = new Map<string, number>();
    for (const e of allEntries()) {
      if (e.participantId) counts.set(e.participantId, (counts.get(e.participantId) ?? 0) + 1);
    }
    return [...store().participants.values()]
      .map((p) => ({ id: p.id, name: p.name, entryCount: counts.get(p.id) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  async getParticipant(participantId) {
    return ref(store().participants.get(participantId));
  },

  async createParticipant(name) {
    const p: StoredParticipant = { id: randomUUID(), name };
    store().participants.set(p.id, p);
    return { ...p };
  },

  async renameParticipant(participantId, name) {
    mustParticipant(participantId).name = name;
    for (const e of allEntries()) if (e.participantId === participantId) e.participantName = name;
  },

  async deleteParticipant(participantId) {
    if (allEntries().some((e) => e.participantId === participantId)) {
      throw new Error("Este participante ainda tem palpites.");
    }
    store().participants.delete(participantId);
  },

  async updateEdition(editionId, patch) {
    const bundle = store().bundles.get(editionId);
    if (!bundle) throw new Error("Edição não encontrada");
    Object.assign(bundle.edition, clone(patch));
  },

  async setEditionTiers(editionId, tiers) {
    const bundle = store().bundles.get(editionId);
    if (!bundle) throw new Error("Edição não encontrada");
    bundle.teams = tiers.flatMap(({ tier, teamIds }) => teamIds.map((id) => ({ ...clone(mustTeam(id)), tier })));
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
        importedResults: null,
      },
      teams: clone(source.teams),
      matches: [],
      entries: [],
    });
    return id;
  },

  async createEdition(input) {
    const s = store();
    const reference = [...s.bundles.values()][0]?.edition;
    const id = randomUUID();
    s.bundles.set(id, {
      edition: {
        id,
        competitionName: reference?.competitionName ?? "Brasileirão Série A",
        standingsCriteria: reference?.standingsCriteria ?? ["points", "wins", "goal_difference", "goals_for", "head_to_head"],
        season: input.season,
        name: input.name,
        status: input.status,
        rules: clone(input.rules),
        entriesDeadline: null,
        prizesText: null,
        manualStandingsOrder: {},
        importedResults: null,
      },
      teams: [],
      matches: [],
      entries: [],
    });
    return id;
  },

  async deleteEdition(editionId) {
    store().bundles.delete(editionId);
  },

  async listTeams() {
    const s = store();
    return [...s.teams.values()]
      .map((team) => ({
        ...clone(team),
        editions: [...s.bundles.values()].flatMap((b) => {
          const found = b.teams.find((t) => t.id === team.id);
          return found ? [{ editionId: b.edition.id, tier: found.tier }] : [];
        }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  async createTeam(input) {
    const team: Team = { id: randomUUID(), crestUrl: null, ...input };
    store().teams.set(team.id, team);
    return clone(team);
  },

  async deleteTeam(teamId) {
    mustTeam(teamId);
    if ([...store().bundles.values()].some((b) => b.teams.some((t) => t.id === teamId))) {
      throw new Error("Este time está em alguma edição.");
    }
    store().teams.delete(teamId);
  },

  async updateTeam(teamId, patch) {
    Object.assign(mustTeam(teamId), patch);
  },

  async setTeamCrest(teamId, png) {
    // Sem armazenamento de arquivos na demonstração: a imagem vai embutida no próprio endereço.
    const url = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
    mustTeam(teamId).crestUrl = url;
    return url;
  },

  async removeTeamCrest(teamId) {
    mustTeam(teamId).crestUrl = null;
  },

  async isAdmin() {
    return true;
  },
};
