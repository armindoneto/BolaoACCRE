import { cache } from "react";
import { buildImportedResult, computeEdition, type EngineResult, type PeriodResult } from "@/lib/scoring";
import { memoryRepo } from "./memory";
import { serviceKey, supabaseRepo } from "./supabase";
import type { Edition, EditionBundle, Repo } from "./types";

export * from "./types";

/** Sem Supabase configurado, o site roda em modo demonstração (dados fictícios em memória). */
export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !serviceKey();
}

export function repo(): Repo {
  return isDemoMode() ? memoryRepo : supabaseRepo;
}

export const listEditions = cache(() => repo().listEditions());

export const getBundle = cache((editionId: string) => repo().getBundle(editionId));

/**
 * Edição em vigor, mostrada nas páginas públicas: a que está em andamento ou,
 * senão, a que está recebendo palpites. Rascunhos não aparecem, e edições
 * encerradas ficam só no Histórico.
 */
export function pickCurrentEdition(editions: Edition[]): Edition | null {
  const bySeason = [...editions].sort((a, b) => b.season - a.season);
  return (
    bySeason.find((e) => e.status === "running") ??
    bySeason.find((e) => e.status === "open_for_entries") ??
    null
  );
}

export const getCurrentBundle = cache(async (): Promise<EditionBundle | null> => {
  const current = pickCurrentEdition(await listEditions());
  return current ? getBundle(current.id) : null;
});

/**
 * Resultado de uma edição. Edições normais passam pelo motor de cálculo (é
 * barato: roda a cada visita). Edições antigas importadas usam os números
 * que vieram prontos da planilha.
 */
export function computeBundle(bundle: EditionBundle): EngineResult {
  const teams = bundle.teams.map((t) => ({ id: t.id, tier: t.tier }));
  const entries = bundle.entries.map((e) => ({ id: e.id, picks: e.picks }));
  if (bundle.edition.importedResults) {
    return buildImportedResult({
      rules: bundle.edition.rules,
      teams,
      entries,
      imported: bundle.edition.importedResults,
    });
  }
  return computeEdition({
    rules: bundle.edition.rules,
    teams,
    matches: bundle.matches,
    entries,
    standingsCriteria: bundle.edition.standingsCriteria,
    manualStandingsOrder: bundle.edition.manualStandingsOrder,
  });
}

/** Turno que abre por padrão: o último que já começou (ou o primeiro). */
export function currentPeriod(result: EngineResult): PeriodResult {
  const started = result.periods.filter((p) => p.status !== "not_started");
  return started[started.length - 1] ?? result.periods[0];
}

/** Os palpites ainda podem ser criados ou editados pelos participantes? */
export function entriesOpen(edition: Edition, now = new Date()): boolean {
  if (edition.status !== "open_for_entries") return false;
  return !edition.entriesDeadline || new Date(edition.entriesDeadline) > now;
}
