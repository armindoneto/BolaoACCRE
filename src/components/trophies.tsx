import { cn } from "@/lib/cn";
import { TROPHY_KINDS, type Trophies, type TrophyKind } from "@/lib/trophy-types";

const STYLE: Record<TrophyKind, { fill: string; text: string; label: string }> = {
  gold: { fill: "#f6c343", text: "#3b2a00", label: "1º lugar" },
  silver: { fill: "#b9c2cc", text: "#1f2937", label: "2º lugar" },
  bronze: { fill: "#d08a4e", text: "#2e1503", label: "3º lugar" },
  last: { fill: "#d93a3a", text: "#ffffff", label: "Lanterna" },
};

/** Troféu colorido com o número de conquistas dentro. */
export function Trophy({ kind, count, size = 44 }: { kind: TrophyKind; count: number; size?: number }) {
  const s = STYLE[kind];
  const title = `${s.label}: ${count} ${count === 1 ? "vez" : "vezes"}`;
  return (
    <svg
      viewBox="0 0 48 54"
      width={size}
      height={(size * 54) / 48}
      role="img"
      aria-label={title}
      className={cn("shrink-0", count === 0 && "opacity-25 grayscale")}
    >
      <title>{title}</title>
      <path d="M11 9H4.500c0 9 3.500 14 9.500 15.500M37 9h6.500c0 9-3.500 14-9.500 15.500" fill="none" stroke={s.fill} strokeWidth="4" strokeLinecap="round" />
      <path d="M9 4h30v15c0 10-6.500 17-15 17S9 29 9 19z" fill={s.fill} />
      <rect x="21" y="35" width="6" height="8" fill={s.fill} />
      <rect x="12" y="42" width="24" height="8" rx="2.500" fill={s.fill} />
      <text
        x="24"
        y="25.500"
        textAnchor="middle"
        fontSize={count > 9 ? 15 : 18}
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        fill={s.text}
      >
        {count}
      </text>
    </svg>
  );
}

/** Os quatro troféus de um participante, lado a lado. */
export function TrophyRow({
  trophies,
  size = 44,
  labels = false,
  hideEmpty = false,
  className,
}: {
  trophies: Trophies;
  size?: number;
  labels?: boolean;
  /** Mostra só os troféus que a pessoa já ganhou. */
  hideEmpty?: boolean;
  className?: string;
}) {
  const kinds = TROPHY_KINDS.filter((k) => !hideEmpty || trophies[k] > 0);
  if (kinds.length === 0) return null;
  return (
    <ul className={cn("flex items-end gap-2", className)}>
      {kinds.map((kind) => (
        <li key={kind} className="flex flex-col items-center gap-0.5">
          <Trophy kind={kind} count={trophies[kind]} size={size} />
          {labels && <span className="text-[10px] font-medium text-muted">{STYLE[kind].label}</span>}
        </li>
      ))}
    </ul>
  );
}
