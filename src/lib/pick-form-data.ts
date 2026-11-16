import type { PickFormTier } from "@/components/pick-form";
import type { EditionBundle } from "@/lib/data";
import { tiersOf, toBadge } from "@/lib/view";

export function pickFormTiers(bundle: EditionBundle): PickFormTier[] {
  return tiersOf(bundle).map((tier) => ({
    tier,
    teams: bundle.teams
      .filter((t) => t.tier === tier)
      .map((t) => ({ ...toBadge(t), id: t.id, shortName: t.shortName })),
  }));
}
