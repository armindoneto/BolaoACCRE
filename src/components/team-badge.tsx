import { cn } from "@/lib/cn";

export interface BadgeTeam {
  name: string;
  code: string;
  crestUrl: string | null;
  color: string;
  color2: string;
}

function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

/** Escudo do time: a imagem cadastrada ou, sem ela, um escudo com a sigla e as cores. */
export function TeamBadge({
  team,
  size = 28,
  className,
}: {
  team: BadgeTeam;
  size?: number;
  className?: string;
}) {
  if (team.crestUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.crestUrl}
        alt={team.name}
        title={team.name}
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const light = isLight(team.color);
  const text = light ? (isLight(team.color2) ? "#111111" : team.color2) : "#FFFFFF";
  return (
    <svg
      viewBox="0 0 40 44"
      width={size}
      height={size * 1.1}
      role="img"
      aria-label={team.name}
      className={cn("shrink-0", className)}
      style={{ width: size, height: size * 1.1 }}
    >
      <title>{team.name}</title>
      <path
        d="M20 1.5 37 6v15.5c0 10-7 17.5-17 21-10-3.500-17-11-17-21V6z"
        fill={team.color}
        stroke={light ? "#9aa5a0" : team.color2}
        strokeOpacity={light ? 1 : 0.55}
        strokeWidth="2"
      />
      <path d="M4.500 8.200 20 4.100l15.500 4.100v3L20 7.100 4.500 11.200z" fill={team.color2} opacity="0.9" />
      <text
        x="20"
        y="27.500"
        textAnchor="middle"
        fontSize="12.500"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        fill={text}
        letterSpacing="-0.3"
      >
        {team.code}
      </text>
    </svg>
  );
}
