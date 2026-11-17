import { RULES_2026, selectionKey } from "@/lib/scoring";
import { TEAMS_2026 } from "./teams2026";
import type { Edition, EditionBundle, EditionStatus, EditionTeam, Entry, Match } from "./types";

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

/** Participantes fictícios: os mesmos nas duas edições de demonstração. */
export const DEMO_PARTICIPANTS = NAMES.map((name, i) => ({ id: `p${i + 1}`, name }));

export const DEMO_TEAMS: EditionTeam[] = TEAMS_2026.map((t) => ({
  id: t.code.toLowerCase(),
  name: t.name,
  shortName: t.shortName,
  code: t.code,
  crestUrl: null,
  color: t.color,
  color2: t.color2,
  tier: t.tier,
}));

interface DemoOptions {
  id: string;
  season: number;
  status: EditionStatus;
  seed: number;
  playedRounds: number;
  /** Rodada com um jogo adiado (sem resultado), ou null. */
  postponedRound: number | null;
  /** Quantos dos participantes fictícios palpitam nesta edição. */
  participants: number;
}

function buildDemoEdition(o: DemoOptions): EditionBundle {
  const rand = mulberry32(o.seed);
  const teams = structuredClone(DEMO_TEAMS);

  // Turno e returno pelo método do círculo.
  const n = teams.length;
  const order = teams.map((t) => t.id);
  const matches: Match[] = [];
  const start = new Date(`${o.season}-04-04T19:00:00Z`).getTime();
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = order[i];
      const b = order[n - 1 - i];
      const flip = (round + i) % 2 === 0;
      const [home, away] = flip ? [a, b] : [b, a];
      for (const leg of [0, 1]) {
        const r = round + 1 + leg * (n - 1);
        matches.push({
          id: `${o.id}-m${r}-${i + 1}`,
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
    if (m.round > o.playedRounds) continue;
    const h = 1.75 - tierOf.get(m.homeTeamId)! * 0.07;
    const a = 1.35 - tierOf.get(m.awayTeamId)! * 0.07;
    m.homeGoals = goals(rand, h);
    m.awayGoals = goals(rand, a);
  }
  if (o.postponedRound !== null) {
    const postponed = matches.find((m) => m.round === o.postponedRound)!;
    postponed.homeGoals = null;
    postponed.awayGoals = null;
  }

  const byTier = new Map<number, EditionTeam[]>();
  for (const t of teams) byTier.set(t.tier, [...(byTier.get(t.tier) ?? []), t]);
  const entries: Entry[] = [];
  const addEntry = (pIndex: number | null, name: string, picks: Record<number, string>) => {
    entries.push({
      id: `${o.id}-e${entries.length + 1}`,
      name,
      participantId: pIndex === null ? null : DEMO_PARTICIPANTS[pIndex].id,
      participantName: pIndex === null ? null : DEMO_PARTICIPANTS[pIndex].name,
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
  for (let i = 0; i < o.participants; i++) {
    // Um em cada quatro faz dois palpites; o primeiro da lista faz três.
    const count = i === 0 ? 3 : i % 4 === 0 ? 2 : 1;
    const name = DEMO_PARTICIPANTS[i].name;
    for (let k = 0; k < count; k++) addEntry(i, count > 1 ? `${name} ${k + 1}` : name, randomPicks());
  }
  // Dois palpites idênticos, para mostrar a posição dividida.
  entries[entries.length - 1].picks = { ...entries[4].picks };
  entries[entries.length - 1].selectionKey = entries[4].selectionKey;
  // Palpites recém-chegados pelo site, ainda sem participante (aguardando revisão do admin).
  if (o.status !== "finished") {
    addEntry(null, "Vai que é tua", randomPicks());
    addEntry(null, "tiao 2", randomPicks());
  }

  const edition: Edition = {
    id: o.id,
    competitionName: "Brasileirão Série A",
    standingsCriteria: ["points", "wins", "goal_difference", "goals_for", "head_to_head"],
    season: o.season,
    name: `Brasileirão ${o.season}`,
    status: o.status,
    rules: RULES_2026,
    entriesDeadline: null,
    prizesText: "1º lugar: 50% · 2º lugar: 25% · 3º lugar: 15% · Último: 10% (em cada turno)",
    manualStandingsOrder: {},
    importedResults: null,
  };

  return { edition, teams, matches, entries };
}

export const DEMO_EDITION_ID = "demo-2026";

/** Edição em andamento (com um jogo adiado no 1º turno) e uma edição anterior, já encerrada. */
export function buildDemoBundles(): EditionBundle[] {
  return [
    buildDemoEdition({
      id: DEMO_EDITION_ID,
      season: 2026,
      status: "running",
      seed: 2026,
      playedRounds: 24,
      postponedRound: 17,
      participants: DEMO_PARTICIPANTS.length,
    }),
    buildDemoEdition({
      id: "demo-2025",
      season: 2025,
      status: "finished",
      seed: 2025,
      playedRounds: 38,
      postponedRound: null,
      participants: 20,
    }),
  ];
}
