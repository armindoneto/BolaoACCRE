"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { RankingViewRow } from "@/lib/view";
import { TeamBadge } from "./team-badge";

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

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

export function RankingRow({ row, showPicks }: { row: RankingViewRow; showPicks: boolean }) {
  const style = prizeStyle(row.prizes[0]);
  return (
    <Link
      href={`/participante/${row.participantId}`}
      className={cn(
        "card block px-3 py-2.5 transition hover:border-primary/50",
        style?.row,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "tabular flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            style ? style.pos : "bg-border/60 text-fg",
          )}
        >
          {row.position}º
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{row.name}</p>
          <p className="truncate text-xs text-muted">
            {[
              row.nickname,
              style && `${style.icon} ${style.label}`,
              row.sharedWith > 1 && `empatado com ${row.sharedWith - 1}`,
            ]
              .filter(Boolean)
              .join(" · ") || " "}
          </p>
        </div>
        <div className="text-right leading-none">
          <span className="tabular text-xl font-extrabold">{row.points}</span>
          <span className="block text-[10px] font-medium uppercase tracking-wide text-muted">pts</span>
        </div>
      </div>
      {showPicks && (
        <div className="mt-2 grid grid-cols-10 gap-0.5">
          {row.teams.map((team) => (
            <div key={team.tier} className="flex flex-col items-center gap-0.5">
              <TeamBadge team={team} size={24} />
              <span className="tabular text-[10px] leading-none text-muted">{team.points}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

/** Lista da classificação com busca pelo nome. */
export function RankingList({ rows, showPicks = true }: { rows: RankingViewRow[]; showPicks?: boolean }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return rows;
    return rows.filter((r) => normalize(`${r.name} ${r.nickname ?? ""}`).includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-2">
      <label className="no-print relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pelo nome"
          className="input pl-9"
        />
      </label>
      {filtered.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">Ninguém encontrado com esse nome.</p>
      ) : (
        <ol className="space-y-2">
          {filtered.map((row) => (
            <li key={row.entryId}>
              <RankingRow row={row} showPicks={showPicks} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
