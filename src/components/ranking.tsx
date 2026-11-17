"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { RankingViewRow } from "@/lib/view";
import { prizeStyle } from "@/lib/prize-style";
import { TeamBadge } from "./team-badge";

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function RankingRow({ row, showPicks }: { row: RankingViewRow; showPicks: boolean }) {
  const style = prizeStyle(row.prizes[0]);
  return (
    <Link
      href={`/participante/${row.participantId}`}
      className={cn(
        // Celular: nome e pontos em cima, escudos embaixo. Desktop: tudo numa linha.
        "card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 transition hover:border-primary/50",
        showPicks && "lg:grid-cols-[auto_minmax(0,15rem)_minmax(0,1fr)_4.5rem] lg:gap-x-4 lg:px-4",
        style?.row,
      )}
    >
      <span
        className={cn(
          "tabular flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          style ? style.pos : "bg-border/60 text-fg",
        )}
      >
        {row.position}º
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight">{row.name}</p>
        <p className="truncate text-xs text-muted">
          {[
            row.nickname,
            style && `${style.icon} ${style.label}`,
            row.sharedWith > 1 && `empatado com ${row.sharedWith - 1}`,
          ]
            .filter(Boolean)
            .join(" · ") || "\u00a0"}
        </p>
      </div>
      <div className="order-3 text-right leading-none lg:order-4">
        <span className="tabular text-xl font-extrabold">{row.points}</span>
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted">pts</span>
      </div>
      {showPicks && (
        <div className="order-4 col-span-3 grid grid-cols-10 gap-0.5 lg:order-3 lg:col-span-1 lg:max-w-xl">
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
      <label className="no-print relative block lg:max-w-sm">
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
