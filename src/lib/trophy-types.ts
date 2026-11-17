import type { PrizePosition } from "@/lib/scoring/types";

/** Troféus do perfil: ouro (1º), prata (2º), bronze (3º) e vermelho (último). */
export type TrophyKind = "gold" | "silver" | "bronze" | "last";

export type Trophies = Record<TrophyKind, number>;

export const TROPHY_KINDS: TrophyKind[] = ["gold", "silver", "bronze", "last"];

export function trophyKind(prize: PrizePosition): TrophyKind | null {
  if (prize === "last") return "last";
  return prize === 1 ? "gold" : prize === 2 ? "silver" : prize === 3 ? "bronze" : null;
}
