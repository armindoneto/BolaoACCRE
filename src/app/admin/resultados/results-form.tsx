"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TeamBadge, type BadgeTeam } from "@/components/team-badge";
import { saveResults } from "../actions";

type Side = BadgeTeam & { shortName: string };

interface Row {
  id: string;
  home: Side;
  away: Side;
  homeGoals: number | null;
  awayGoals: number | null;
}

const text = (n: number | null) => (n === null ? "" : String(n));

/** Placar de todos os jogos da rodada, salvos de uma vez. */
export function ResultsForm({ editionId, matches }: { editionId: string; matches: Row[] }) {
  const router = useRouter();
  const [values, setValues] = useState(() =>
    Object.fromEntries(matches.map((m) => [m.id, { h: text(m.homeGoals), a: text(m.awayGoals) }])),
  );
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = matches.some(
    (m) => values[m.id].h !== text(m.homeGoals) || values[m.id].a !== text(m.awayGoals),
  );

  function set(id: string, side: "h" | "a", raw: string) {
    const value = raw.replace(/\D/g, "").slice(0, 2);
    setValues((v) => ({ ...v, [id]: { ...v[id], [side]: value } }));
    setFeedback(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const half = matches.find((m) => (values[m.id].h === "") !== (values[m.id].a === ""));
    if (half) {
      setFeedback({ ok: false, text: `Placar pela metade em ${half.home.shortName} × ${half.away.shortName}.` });
      return;
    }
    startTransition(async () => {
      const result = await saveResults(
        editionId,
        matches.map((m) => ({
          matchId: m.id,
          homeGoals: values[m.id].h === "" ? null : Number(values[m.id].h),
          awayGoals: values[m.id].a === "" ? null : Number(values[m.id].a),
        })),
      );
      setFeedback(result.ok ? { ok: true, text: result.message ?? "Salvo." } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });
  }

  const inputClass =
    "tabular h-12 w-12 rounded-xl border border-border bg-card text-center text-xl font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

  return (
    <form onSubmit={submit} className="space-y-3">
      <ul className="card grid divide-y divide-border/60 lg:grid-cols-2 lg:gap-x-6 lg:px-3">
        {matches.map((m) => (
          <li key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 py-2">
            <span className="flex min-w-0 items-center justify-end gap-2 text-right text-sm font-medium">
              <span className="truncate">{m.home.shortName}</span>
              <TeamBadge team={m.home} size={26} />
            </span>
            <span className="flex items-center gap-1.5">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Gols de ${m.home.name}`}
                className={inputClass}
                value={values[m.id].h}
                onChange={(e) => set(m.id, "h", e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <span className="text-muted">×</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Gols de ${m.away.name}`}
                className={inputClass}
                value={values[m.id].a}
                onChange={(e) => set(m.id, "a", e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </span>
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <TeamBadge team={m.away} size={26} />
              <span className="truncate">{m.away.shortName}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        Deixe em branco os jogos que ainda não aconteceram (ou foram adiados). Para apagar um resultado, limpe os dois campos.
      </p>
      {feedback && (
        <p
          role="status"
          className={
            feedback.ok
              ? "rounded-xl bg-primary-soft p-3 text-sm font-medium text-primary"
              : "rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger"
          }
        >
          {feedback.text}
        </p>
      )}
      <div className="sticky bottom-4 z-10 lg:mx-auto lg:max-w-md">
        <button type="submit" className="btn-primary min-h-14 w-full text-base shadow-lg" disabled={pending || !dirty}>
          {pending ? "Salvando…" : dirty ? "Salvar resultados" : "Nada para salvar"}
        </button>
      </div>
    </form>
  );
}
