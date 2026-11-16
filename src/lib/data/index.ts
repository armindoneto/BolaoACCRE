import { cache } from "react";
import { computeEdition, type EngineResult, type PeriodResult } from "@/lib/scoring";
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
 * Edição mostrada nas páginas públicas: a que está em andamento; senão a que
 * está recebendo palpites; senão a última encerrada. Rascunhos nunca aparecem.
 */
export function pickCurrentEdition(editions: Edition[]): Edition | null {
  const bySeason = [...editions].sort((a, b) => b.season - a.season);
  return (
    bySeason.find((e) => e.status === "running") ??
    bySeason.find((e) => e.status === "open_for_entries") ??
    bySeason.find((e) => e.status === "finished") ??
    null
  );
}

export const getCurrentBundle = cache(async (): Promise<EditionBundle | null> => {
  const current = pickCurrentEdition(await listEditions());
  return current ? getBundle(current.id) : null;
});

/** Roda o motor de cálculo para uma edição. Barato: é feito a cada visita. */
export function computeBundle(bundle: EditionBundle): EngineResult {
  return computeEdition({
    rules: bundle.edition.rules,
    teams: bundle.teams.map((t) => ({ id: t.id, tier: t.tier })),
    matches: bundle.matches,
    entries: bundle.entries.map((e) => ({ id: e.id, picks: e.picks })),
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
