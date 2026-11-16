/** Cores e ícones de cada posição premiada. */
const PRIZE_STYLE = {
  1: { row: "border-gold bg-gold-soft", pos: "bg-gold text-black", icon: "🥇", label: "1º lugar" },
  2: { row: "border-silver bg-silver-soft", pos: "bg-silver text-black", icon: "🥈", label: "2º lugar" },
  3: { row: "border-bronze bg-bronze-soft", pos: "bg-bronze text-black", icon: "🥉", label: "3º lugar" },
  last: { row: "border-last/50 bg-last-soft", pos: "bg-last text-white", icon: "🔦", label: "Lanterna" },
} as const;

export function prizeStyle(prize: number | "last" | undefined) {
  if (prize === undefined) return null;
  if (prize === "last") return PRIZE_STYLE.last;
  return PRIZE_STYLE[prize as 1 | 2 | 3] ?? {
    row: "border-primary/40 bg-primary-soft",
    pos: "bg-primary text-primary-fg",
    icon: "🏅",
    label: `${prize}º lugar`,
  };
}
