import { z } from "zod";
import type { Rules } from "./types";

const points = z.number().refine((n) => Number.isInteger(Math.round(n * 10)) && Math.abs(n * 10 - Math.round(n * 10)) < 1e-9, {
  message: "Os pontos aceitam no máximo uma casa decimal (ex.: 0.5)",
});
const tiers = z.array(z.number().int().positive()).min(1);
const label = z.string().min(1).optional();

const matchRule = z.discriminatedUnion("type", [
  z.object({ type: z.literal("win"), points, label }).strict(),
  z.object({ type: z.literal("draw"), points, label }).strict(),
  z.object({ type: z.literal("loss"), points, label }).strict(),
  z.object({ type: z.literal("win_by_margin"), minMargin: z.number().int().positive(), points, label }).strict(),
  z.object({ type: z.literal("loss_by_margin"), minMargin: z.number().int().positive(), points, label }).strict(),
  z.object({ type: z.literal("away_win"), points, label }).strict(),
  z.object({ type: z.literal("win_vs_tiers"), teamTiers: tiers, opponentTiers: tiers, points, label }).strict(),
]);

const periodEndRule = z
  .object({
    type: z.literal("standing_position"),
    positions: z.union([
      z.array(z.number().int().positive()).min(1),
      z.string().regex(/^last[1-9]\d*$/, 'Use uma lista de posições ou "lastN" (ex.: "last4")'),
    ]),
    teamTiers: tiers.optional(),
    points,
    label,
  })
  .strict();

const tiebreaker = z.discriminatedUnion("type", [
  z.object({ type: z.literal("total_points") }).strict(),
  z.object({ type: z.literal("tier_points_sequence"), tiers }).strict(),
]);

export const rulesSchema = z
  .object({
    periods: z
      .array(
        z
          .object({
            id: z.string().min(1),
            name: z.string().min(1),
            rounds: z.tuple([z.number().int().positive(), z.number().int().positive()]),
          })
          .strict()
          .refine((p) => p.rounds[0] <= p.rounds[1], { message: "A rodada inicial deve vir antes da final" }),
      )
      .min(1),
    matchRules: z.array(matchRule),
    periodEndRules: z.array(periodEndRule),
    tiebreakers: z.array(tiebreaker).min(1),
    fullTieBehavior: z.literal("share_position"),
    prizes: z
      .object({
        scope: z.literal("per_period"),
        positions: z.array(z.union([z.number().int().positive(), z.literal("last")])),
        ranking: z.literal("dense"),
        tieBehavior: z.literal("split"),
      })
      .strict(),
  })
  .strict()
  .superRefine((rules, ctx) => {
    const ids = new Set<string>();
    for (const p of rules.periods) {
      if (ids.has(p.id)) ctx.addIssue({ code: "custom", message: `Turno repetido: ${p.id}` });
      ids.add(p.id);
    }
    const sorted = [...rules.periods].sort((a, b) => a.rounds[0] - b.rounds[0]);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].rounds[0] <= sorted[i - 1].rounds[1]) {
        ctx.addIssue({ code: "custom", message: "As rodadas dos turnos não podem se sobrepor" });
      }
    }
  });

export type RulesParseResult = { ok: true; rules: Rules } | { ok: false; errors: string[] };

/** Valida o JSON de regras de uma edição e devolve erros legíveis. */
export function parseRules(value: unknown): RulesParseResult {
  const result = rulesSchema.safeParse(value);
  if (result.success) return { ok: true, rules: result.data as Rules };
  return {
    ok: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message,
    ),
  };
}
