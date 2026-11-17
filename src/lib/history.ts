import { cache } from "react";
import { computeBundle, getBundle, listEditions, type EditionBundle, type Entry } from "@/lib/data";
import type { EngineResult, PeriodStatus, PrizePosition } from "@/lib/scoring";
import { entryLabels } from "@/lib/view";
import { trophyKind, type Trophies } from "./trophy-types";

export interface ComputedEdition {
  bundle: EditionBundle;
  result: EngineResult;
}

/** Todas as edições visíveis ao público (tudo menos rascunho), já calculadas, da mais nova para a mais antiga. */
export const getPublicEditions = cache(async (): Promise<ComputedEdition[]> => {
  const editions = (await listEditions()).filter((e) => e.status !== "draft");
  const bundles = await Promise.all(editions.map((e) => getBundle(e.id)));
  return bundles
    .filter((b): b is EditionBundle => b !== null)
    .sort((a, b) => b.edition.season - a.edition.season || a.edition.name.localeCompare(b.edition.name))
    .map((bundle) => ({ bundle, result: computeBundle(bundle) }));
});

export { TROPHY_KINDS, trophyKind, type Trophies, type TrophyKind } from "./trophy-types";

const empty = (): Trophies => ({ gold: 0, silver: 0, bronze: 0, last: 0 });

export const trophyTotal = (t: Trophies) => t.gold + t.silver + t.bronze + t.last;

/**
 * Troféus de cada participante: um por palpite premiado em cada turno
 * ENCERRADO (prêmio dividido também conta). Turno em andamento não conta.
 */
export function trophiesByParticipant(all: ComputedEdition[]): Map<string, Trophies> {
  const map = new Map<string, Trophies>();
  for (const { bundle, result } of all) {
    const owner = new Map(bundle.entries.map((e) => [e.id, e.participantId]));
    for (const period of result.periods) {
      if (period.status !== "final") continue;
      for (const row of period.ranking) {
        const participantId = owner.get(row.entryId);
        if (!participantId) continue;
        for (const prize of row.prizes) {
          const kind = trophyKind(prize);
          if (!kind) continue;
          const t = map.get(participantId) ?? empty();
          t[kind]++;
          map.set(participantId, t);
        }
      }
    }
  }
  return map;
}

export function trophiesOf(all: ComputedEdition[], participantId: string): Trophies {
  return trophiesByParticipant(all).get(participantId) ?? empty();
}

export interface HistoryEntry {
  entry: Entry;
  label: string;
  periods: {
    id: string;
    name: string;
    status: PeriodStatus;
    position: number;
    of: number;
    tenths: number;
    prizes: PrizePosition[];
    sharedWith: number;
  }[];
}

export interface ParticipantEdition {
  bundle: EditionBundle;
  result: EngineResult;
  entries: HistoryEntry[];
}

/** Palpites de um participante em cada edição, com a colocação em cada turno. */
export function participantHistory(all: ComputedEdition[], participantId: string): ParticipantEdition[] {
  return all.flatMap(({ bundle, result }) => {
    const mine = bundle.entries.filter((e) => e.participantId === participantId);
    if (mine.length === 0) return [];
    const labels = entryLabels(bundle);
    return [
      {
        bundle,
        result,
        entries: mine.map((entry) => ({
          entry,
          label: labels.get(entry.id) ?? entry.participantName,
          periods: result.periods.flatMap((period) => {
            const row = period.ranking.find((r) => r.entryId === entry.id);
            return row
              ? [
                  {
                    id: period.period.id,
                    name: period.period.name,
                    status: period.status,
                    position: row.position,
                    of: period.ranking.length,
                    tenths: row.tenths,
                    prizes: row.prizes,
                    sharedWith: row.sharedWith,
                  },
                ]
              : [];
          }),
        })),
      },
    ];
  });
}
