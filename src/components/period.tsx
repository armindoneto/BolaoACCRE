import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import type { PeriodResult } from "@/lib/scoring";
import type { EditionBundle } from "@/lib/data";
import { cn } from "@/lib/cn";
import { matchLabel } from "@/lib/view";

/** Abas 1º turno / 2º turno (links com ?turno=). */
export function PeriodTabs({
  periods,
  selected,
  basePath,
  extra,
}: {
  periods: PeriodResult[];
  selected: string;
  basePath: string;
  extra?: Record<string, string>;
}) {
  if (periods.length < 2) return null;
  return (
    <div className="no-print flex rounded-xl border border-border bg-card p-1">
      {periods.map((p) => {
        const params = new URLSearchParams({ ...extra, turno: p.period.id });
        const active = p.period.id === selected;
        return (
          <Link
            key={p.period.id}
            href={`${basePath}?${params}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg py-2 text-center text-sm font-semibold",
              active ? "bg-primary text-primary-fg" : "text-muted hover:text-fg",
            )}
          >
            {p.period.name}
          </Link>
        );
      })}
    </div>
  );
}

export function PeriodStatusChip({ period }: { period: PeriodResult }) {
  const map = {
    not_started: ["Ainda não começou", "bg-border/60 text-muted"],
    in_progress: ["Em andamento", "bg-primary-soft text-primary"],
    pending: ["Resultado pendente", "bg-warn-soft text-warn"],
    final: ["Encerrado", "bg-border/60 text-fg"],
  } as const;
  const [text, cls] = map[period.status];
  return <span className={cn("chip", cls)}>{text}</span>;
}

/** Aviso de turno pendente por jogo adiado. */
export function PendingNotice({ bundle, period }: { bundle: EditionBundle; period: PeriodResult }) {
  if (period.status !== "pending") return null;
  return (
    <div className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
      <Clock className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-semibold">
          {period.postponedMatches.length === 1 ? "Aguardando jogo adiado" : "Aguardando jogos adiados"}:{" "}
          {period.postponedMatches.map((m) => matchLabel(bundle, m)).join(", ")}
        </p>
        <p className="mt-0.5 opacity-90">
          A classificação do {period.period.name} é <strong>parcial</strong>. Os pontos de fim de turno e a
          premiação só saem depois {period.postponedMatches.length === 1 ? "desse jogo" : "desses jogos"}.
        </p>
      </div>
    </div>
  );
}

/** Aviso de empate na tabela que o sistema não consegue resolver sozinho. */
export function UnresolvedTieNotice({ period }: { period: PeriodResult }) {
  if (period.status !== "final" || !period.standings.some((s) => s.unresolvedTie)) return null;
  return (
    <div className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" />
      <p>
        Há times empatados em todos os critérios na tabela do {period.period.name}. A ordem entre eles
        ainda será confirmada pelo administrador.
      </p>
    </div>
  );
}
