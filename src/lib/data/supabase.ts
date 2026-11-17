import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_STANDINGS_CRITERIA, selectionKey, type Rules } from "@/lib/scoring";
import type { Edition, EditionBundle, EditionTeam, Entry, Match, Repo } from "./types";
import { normalizeName, teamCodeFromName } from "./util";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Schema do Postgres onde ficam as tabelas do bolão (veja a migration). */
const DB_SCHEMA = process.env.SUPABASE_DB_SCHEMA || "bolao";

/** Depósito (bucket) público do Supabase Storage onde ficam os escudos. */
const CREST_BUCKET = process.env.SUPABASE_CREST_BUCKET || "bolao-escudos";

/** Chave secreta do servidor: aceita o nome novo (secret) e o antigo (service_role). */
export function serviceKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

let client: SupabaseClient<any, any, any> | null = null;

/**
 * Cliente com a chave de serviço: só roda no servidor e ignora o RLS.
 * Toda rota que chama este repositório faz a própria checagem de permissão
 * (admin logado, token do link pessoal ou prazo de palpites).
 */
function db(): SupabaseClient<any, any, any> {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = serviceKey();
    if (!url || !key) throw new Error("Supabase não configurado (veja .env.example)");
    client = createClient(url, key, {
      db: { schema: DB_SCHEMA },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function check(result: { data: unknown; error: { message: string } | null }): any {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const EDITION_COLUMNS =
  "id, season, name, status, rules, entries_deadline, prizes_text, manual_standings_order, imported_results, competition_id, competitions(name, standings_criteria)";

function mapEdition(row: any): Edition {
  return {
    id: row.id,
    competitionName: row.competitions?.name ?? "",
    standingsCriteria: row.competitions?.standings_criteria ?? DEFAULT_STANDINGS_CRITERIA,
    season: row.season,
    name: row.name,
    status: row.status,
    rules: row.rules as Rules,
    entriesDeadline: row.entries_deadline,
    prizesText: row.prizes_text,
    manualStandingsOrder: row.manual_standings_order ?? {},
    importedResults: row.imported_results ?? null,
  };
}

function mapTeam(row: any, tier: number): EditionTeam {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    code: row.code,
    crestUrl: row.crest_url,
    color: row.color,
    color2: row.color2,
    tier,
  };
}

function mapMatch(row: any): Match {
  return {
    id: row.id,
    round: row.round,
    date: row.date,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeGoals: row.home_goals,
    awayGoals: row.away_goals,
  };
}

const ENTRY_COLUMNS =
  "id, edition_id, participant_id, name, selection_key, created_at, participants(display_name), entry_picks(tier, team_id)";

function mapEntry(row: any): Entry {
  const picks: Record<number, string> = {};
  for (const p of row.entry_picks ?? []) picks[p.tier] = p.team_id;
  return {
    id: row.id,
    name: row.name,
    participantId: row.participant_id ?? null,
    participantName: row.participants?.display_name ?? null,
    selectionKey: row.selection_key,
    picks,
    createdAt: row.created_at,
  };
}

function toRef(row: any) {
  return row ? { id: row.id as string, name: row.display_name as string } : null;
}

async function writePicks(entryId: string, picks: Record<number, string>) {
  check(await db().from("entry_picks").delete().eq("entry_id", entryId));
  const rows = Object.entries(picks).map(([tier, teamId]) => ({
    entry_id: entryId,
    tier: Number(tier),
    team_id: teamId,
  }));
  if (rows.length) check(await db().from("entry_picks").insert(rows));
}

export const supabaseRepo: Repo = {
  async listEditions() {
    const rows = check(
      await db().from("editions").select(EDITION_COLUMNS).order("season", { ascending: false }).order("name"),
    );
    return (rows ?? []).map(mapEdition);
  },

  async getBundle(editionId) {
    const [edition, teams, matches, entries] = await Promise.all([
      db().from("editions").select(EDITION_COLUMNS).eq("id", editionId).maybeSingle(),
      db().from("edition_teams").select("tier, teams(*)").eq("edition_id", editionId).order("tier"),
      db().from("matches").select("*").eq("edition_id", editionId).order("round").order("date").order("id"),
      db().from("entries").select(ENTRY_COLUMNS).eq("edition_id", editionId).order("created_at"),
    ]);
    const editionRow = check(edition);
    if (!editionRow) return null;
    const bundle: EditionBundle = {
      edition: mapEdition(editionRow),
      teams: (check(teams) ?? []).map((row: any) => mapTeam(row.teams, row.tier)),
      matches: (check(matches) ?? []).map(mapMatch),
      entries: (check(entries) ?? []).map(mapEntry),
    };
    return bundle;
  },

  async saveResults(editionId, results) {
    await Promise.all(
      results.map(async (r) =>
        check(
          await db()
            .from("matches")
            .update({ home_goals: r.homeGoals, away_goals: r.awayGoals })
            .eq("id", r.matchId)
            .eq("edition_id", editionId),
        ),
      ),
    );
  },

  async replaceMatches(editionId, rows) {
    check(await db().from("matches").delete().eq("edition_id", editionId));
    if (rows.length === 0) return;
    check(
      await db()
        .from("matches")
        .insert(
          rows.map((r) => ({
            edition_id: editionId,
            round: r.round,
            date: r.date,
            home_team_id: r.homeTeamId,
            away_team_id: r.awayTeamId,
            home_goals: r.homeGoals,
            away_goals: r.awayGoals,
          })),
        ),
    );
  },

  async createEntry(input) {
    const row = check(
      await db()
        .from("entries")
        .insert({
          edition_id: input.editionId,
          participant_id: input.participantId,
          name: input.name,
          selection_key: selectionKey(input.picks),
        })
        .select("id")
        .single(),
    );
    await writePicks(row.id, input.picks);
    const full = check(await db().from("entries").select(ENTRY_COLUMNS).eq("id", row.id).single());
    return mapEntry(full);
  },

  async createEntries(inputs) {
    if (inputs.length === 0) return [];
    const rows = check(
      await db()
        .from("entries")
        .insert(
          inputs.map((input) => ({
            edition_id: input.editionId,
            participant_id: input.participantId,
            name: input.name,
            selection_key: selectionKey(input.picks),
          })),
        )
        .select("id, name"),
    );
    // Os nomes são únicos dentro da edição: servem para casar cada linha com o seu id.
    const idByName = new Map<string, string>(rows.map((r: any) => [r.name, r.id]));
    const ids = inputs.map((input) => {
      const id = idByName.get(input.name);
      if (!id) throw new Error(`Palpite não gravado: ${input.name}`);
      return id;
    });
    check(
      await db()
        .from("entry_picks")
        .insert(
          inputs.flatMap((input, i) =>
            Object.entries(input.picks).map(([tier, teamId]) => ({
              entry_id: ids[i],
              tier: Number(tier),
              team_id: teamId,
            })),
          ),
        ),
    );
    return ids;
  },

  async updateEntry(entryId, patch) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.picks) row.selection_key = selectionKey(patch.picks);
    if (patch.participantId !== undefined) row.participant_id = patch.participantId;
    if (Object.keys(row).length) check(await db().from("entries").update(row).eq("id", entryId));
    if (patch.picks) await writePicks(entryId, patch.picks);
  },

  async deleteEntry(entryId) {
    check(await db().from("entries").delete().eq("id", entryId));
  },

  async listParticipants() {
    const [participants, entries] = await Promise.all([
      db().from("participants").select("id, display_name").order("display_name"),
      db().from("entries").select("participant_id").not("participant_id", "is", null),
    ]);
    const counts = new Map<string, number>();
    for (const e of check(entries) ?? []) {
      counts.set(e.participant_id, (counts.get(e.participant_id) ?? 0) + 1);
    }
    return (check(participants) ?? [])
      .map((p: any) => ({ id: p.id, name: p.display_name, entryCount: counts.get(p.id) ?? 0 }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name, "pt-BR"));
  },

  async getParticipant(participantId) {
    return toRef(
      check(await db().from("participants").select("id, display_name").eq("id", participantId).maybeSingle()),
    );
  },

  async createParticipant(name) {
    const row = check(
      await db().from("participants").insert({ display_name: name }).select("id, display_name").single(),
    );
    return { id: row.id, name: row.display_name };
  },

  async renameParticipant(participantId, name) {
    check(await db().from("participants").update({ display_name: name }).eq("id", participantId));
  },

  async deleteParticipant(participantId) {
    const entries = check(
      await db().from("entries").select("id").eq("participant_id", participantId).limit(1),
    );
    if (entries?.length) throw new Error("Este participante ainda tem palpites.");
    check(await db().from("participants").delete().eq("id", participantId));
  },

  async updateEdition(editionId, patch) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.season !== undefined) row.season = patch.season;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.rules !== undefined) row.rules = patch.rules;
    if (patch.entriesDeadline !== undefined) row.entries_deadline = patch.entriesDeadline;
    if (patch.prizesText !== undefined) row.prizes_text = patch.prizesText;
    if (patch.manualStandingsOrder !== undefined) row.manual_standings_order = patch.manualStandingsOrder;
    if (patch.importedResults !== undefined) row.imported_results = patch.importedResults;
    if (Object.keys(row).length === 0) return;
    check(await db().from("editions").update(row).eq("id", editionId));
  },

  async setEditionTiers(editionId, tiers) {
    const all = check(await db().from("teams").select("id, name, short_name")) ?? [];
    const rows: { edition_id: string; team_id: string; tier: number }[] = [];
    for (const { tier, teamNames } of tiers) {
      for (const name of teamNames) {
        const key = normalizeName(name);
        let team: any = all.find(
          (t: any) => normalizeName(t.name) === key || normalizeName(t.short_name) === key,
        );
        if (!team) {
          team = check(
            await db()
              .from("teams")
              .insert({ name, short_name: name, code: teamCodeFromName(name) })
              .select("id, name, short_name")
              .single(),
          );
          all.push(team);
        }
        rows.push({ edition_id: editionId, team_id: team.id, tier });
      }
    }
    check(await db().from("edition_teams").delete().eq("edition_id", editionId));
    if (rows.length) check(await db().from("edition_teams").insert(rows));
  },

  async duplicateEdition(editionId, name, season) {
    const source = check(await db().from("editions").select("*").eq("id", editionId).single());
    const created = check(
      await db()
        .from("editions")
        .insert({
          competition_id: source.competition_id,
          season,
          name,
          status: "draft",
          rules: source.rules,
          prizes_text: source.prizes_text,
        })
        .select("id")
        .single(),
    );
    const teams = check(await db().from("edition_teams").select("team_id, tier").eq("edition_id", editionId));
    if (teams?.length) {
      check(
        await db()
          .from("edition_teams")
          .insert(teams.map((t: any) => ({ edition_id: created.id, team_id: t.team_id, tier: t.tier }))),
      );
    }
    return created.id as string;
  },

  async createEdition(input) {
    // Usa o campeonato da edição mais recente (ou o primeiro cadastrado).
    const latest = check(
      await db().from("editions").select("competition_id").order("season", { ascending: false }).limit(1),
    );
    let competitionId = latest?.[0]?.competition_id;
    if (!competitionId) {
      const first = check(await db().from("competitions").select("id").order("name").limit(1));
      competitionId = first?.[0]?.id;
    }
    if (!competitionId) throw new Error("Nenhum campeonato cadastrado.");
    const created = check(
      await db()
        .from("editions")
        .insert({
          competition_id: competitionId,
          season: input.season,
          name: input.name,
          status: input.status,
          rules: input.rules,
        })
        .select("id")
        .single(),
    );
    return created.id as string;
  },

  async deleteEdition(editionId) {
    check(await db().from("editions").delete().eq("id", editionId));
  },

  async updateTeam(teamId, patch) {
    check(
      await db()
        .from("teams")
        .update({
          name: patch.name,
          short_name: patch.shortName,
          code: patch.code,
          color: patch.color,
          color2: patch.color2,
        })
        .eq("id", teamId),
    );
  },

  async setTeamCrest(teamId, png) {
    const storage = db().storage;
    // Cria o depósito público de escudos no primeiro uso.
    const existing = await storage.getBucket(CREST_BUCKET);
    if (existing.error) {
      const created = await storage.createBucket(CREST_BUCKET, {
        public: true,
        fileSizeLimit: 1024 * 1024,
        allowedMimeTypes: ["image/png"],
      });
      if (created.error && !/exist/i.test(created.error.message)) throw new Error(created.error.message);
    }
    const path = `${teamId}.png`;
    const uploaded = await storage
      .from(CREST_BUCKET)
      .upload(path, png, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
    if (uploaded.error) throw new Error(uploaded.error.message);
    // O "?v=" muda a cada envio, para o navegador não mostrar o escudo antigo.
    const url = `${storage.from(CREST_BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    check(await db().from("teams").update({ crest_url: url }).eq("id", teamId));
    return url;
  },

  async removeTeamCrest(teamId) {
    check(await db().from("teams").update({ crest_url: null }).eq("id", teamId));
    await db().storage.from(CREST_BUCKET).remove([`${teamId}.png`]);
  },

  async isAdmin(userId) {
    const row = check(await db().from("admins").select("user_id").eq("user_id", userId).maybeSingle());
    return Boolean(row);
  },
};
