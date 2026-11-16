import { RULES_2026, selectionKey } from "@/lib/scoring";
import { TEAMS_2026 } from "./teams2026";
import type { Edition, EditionBundle, EditionTeam, Entry, Match } from "./types";

/** Gerador determinístico, para a demonstração ser sempre igual. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function goals(rand: () => number, strength: number): number {
  // Poisson simples
  const limit = Math.exp(-strength);
  let k = 0;
  let p = rand();
  while (p > limit) {
    k++;
    p *= rand();
  }
  return Math.min(k, 6);
}

const NAMES = [
  "Armindo", "Carla Menezes", "Seu Jorge", "Paulo Henrique", "Fernanda Lima", "Tião", "Rogério Alves",
  "Bia Castro", "Marcão", "Dona Lúcia", "Edu Pacheco", "Thaís Moura", "Zé Carlos", "Renata Farias",
  "Gustavo Nery", "Léo Batista", "Simone Prado", "Dudu", "Márcia Reis", "Otávio Brandão", "Kátia Souza",
  "Nando", "Vera Antunes", "Chico Lopes", "Priscila Dantas", "Wagner Teles", "Júlia Sampaio", "Beto",
];

export const DEMO_EDITION_ID = "demo-2026";
export const DEMO_PLAYED_ROUNDS = 24;

export function buildDemoBundle(): EditionBundle {
  const rand = mulberry32(2026);
  const teams: EditionTeam[] = TEAMS_2026.map((t) => ({
    id: t.code.toLowerCase(),
    name: t.name,
    shortName: t.shortName,
    code: t.code,
    crestUrl: null,
    color: t.color,
    color2: t.color2,
    tier: t.tier,
  }));

  // Turno e returno pelo método do círculo.
  const n = teams.length;
  const order = teams.map((t) => t.id);
  const matches: Match[] = [];
  const start = new Date("2026-04-04T19:00:00Z").getTime();
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = order[i];
      const b = order[n - 1 - i];
      const flip = (round + i) % 2 === 0;
      const [home, away] = flip ? [a, b] : [b, a];
      for (const leg of [0, 1]) {
        const r = round + 1 + leg * (n - 1);
        matches.push({
          id: `m${r}-${i + 1}`,
          round: r,
          date: new Date(start + (r - 1) * 7 * 86400000 + i * 3600000).toISOString(),
          homeTeamId: leg === 0 ? home : away,
          awayTeamId: leg === 0 ? away : home,
          homeGoals: null,
          awayGoals: null,
        });
      }
    }
    order.splice(1, 0, order.pop()!);
  }
  matches.sort((x, y) => x.round - y.round || x.id.localeCompare(y.id, undefined, { numeric: true }));

  const tierOf = new Map(teams.map((t) => [t.id, t.tier]));
  for (const m of matches) {
    if (m.round > DEMO_PLAYED_ROUNDS) continue;
    const h = 1.75 - tierOf.get(m.homeTeamId)! * 0.07;
    const a = 1.35 - tierOf.get(m.awayTeamId)! * 0.07;
    m.homeGoals = goals(rand, h);
    m.awayGoals = goals(rand, a);
  }
  // Um jogo adiado no 1º turno, para mostrar o aviso de turno pendente.
  const postponed = matches.find((m) => m.round === 17)!;
  postponed.homeGoals = null;
  postponed.awayGoals = null;

  const byTier = new Map<number, EditionTeam[]>();
  for (const t of teams) byTier.set(t.tier, [...(byTier.get(t.tier) ?? []), t]);
  const entries: Entry[] = [];
  const addEntry = (pIndex: number, nickname: string | null, picks: Record<number, string>) => {
    entries.push({
      id: `e${entries.length + 1}`,
      participantId: `p${pIndex + 1}`,
      participantName: NAMES[pIndex],
      nickname,
      selectionKey: selectionKey(picks),
      picks,
      createdAt: new Date(start - 86400000 * 5 + entries.length * 60000).toISOString(),
    });
  };
  const randomPicks = () => {
    const picks: Record<number, string> = {};
    for (const [tier, options] of byTier) picks[tier] = options[Math.floor(rand() * options.length)].id;
    return picks;
  };
  NAMES.forEach((_, i) => {
    const two = i % 4 === 0;
    addEntry(i, two ? "Palpite 1" : null, randomPicks());
    if (two) addEntry(i, "Palpite 2", randomPicks());
  });
  // Dois palpites idênticos, para mostrar a posição dividida.
  entries[entries.length - 1].picks = { ...entries[3].picks };
  entries[entries.length - 1].selectionKey = entries[3].selectionKey;

  const edition: Edition = {
    id: DEMO_EDITION_ID,
    competitionName: "Brasileirão Série A",
    standingsCriteria: ["points", "wins", "goal_difference", "goals_for", "head_to_head"],
    season: 2026,
    name: "Brasileirão 2026",
    status: "running",
    rules: RULES_2026,
    entriesDeadline: null,
    prizesText: "1º lugar: 50% · 2º lugar: 25% · 3º lugar: 15% · Último: 10% (em cada turno)",
    manualStandingsOrder: {},
  };

  return { edition, teams, matches, entries };
}
