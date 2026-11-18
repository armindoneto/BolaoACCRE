"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { TeamBadge, type BadgeTeam } from "@/components/team-badge";
import { cn } from "@/lib/cn";
import { adminDeleteEntry, adminReviewEntry } from "../actions";

/**
 * Etiqueta "times repetidos": ao passar o mouse (ou tocar, no celular), mostra
 * quais são os outros palpites com exatamente os mesmos times.
 */
function RepeatedTag({ names }: { names: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  // No celular a lista abre com um toque e fecha ao tocar em qualquer outro lugar.
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <span
      ref={ref}
      className="group relative"
      // Só o mouse "sai": no toque, o navegador avisa uma saída falsa logo depois do toque.
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="chip cursor-help bg-border/60 text-fg"
      >
        times repetidos
      </button>
      <span
        role="tooltip"
        className={cn(
          "absolute top-full left-0 z-20 mt-1 w-max max-w-64 rounded-xl border border-border bg-card p-2.5 text-xs text-fg shadow-lg",
          open ? "block" : "hidden group-hover:block",
        )}
      >
        <span className="mb-1 block font-semibold">Mesmos times que:</span>
        <span className="block space-y-0.5">
          {names.map((name) => (
            <span key={name} className="block">{name}</span>
          ))}
        </span>
      </span>
    </span>
  );
}

/** Um palpite na lista do admin: ajustar o nome e atribuir a um participante, ali mesmo. */
export function ReviewRow({
  editionId,
  entry,
  participants,
  repeatedWith,
  badges,
}: {
  editionId: string;
  entry: { id: string; name: string; participantId: string | null };
  participants: { id: string; name: string }[];
  /** Nomes dos outros palpites com exatamente os mesmos times (vazio se não houver). */
  repeatedWith: string[];
  badges: BadgeTeam[];
}) {
  const router = useRouter();
  const [name, setName] = useState(entry.name);
  const [participantId, setParticipantId] = useState(entry.participantId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty = name.trim() !== entry.name || participantId !== (entry.participantId ?? "");
  const unassigned = entry.participantId === null;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await adminReviewEntry(editionId, entry.id, name, participantId || null);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      } else setError(result.error);
    });
  }

  return (
    <form onSubmit={save} className={cn("card space-y-2 p-3", unassigned && "border-warn/50")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          {unassigned && <span className="chip bg-warn-soft text-warn">sem participante</span>}
          {repeatedWith.length > 0 && <RepeatedTag names={repeatedWith} />}
          {!unassigned && repeatedWith.length === 0 && (
            <span className="chip bg-primary-soft text-primary">
              <Check className="size-3.5" strokeWidth={3} /> Aposta Validada
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Link
            href={`/admin/palpites/${entry.id}?edicao=${editionId}`}
            aria-label="Mudar os times"
            title="Mudar os times"
            className="btn-outline size-10 min-h-10 px-0"
          >
            <Pencil className="size-4" />
          </Link>
          <button
            type="button"
            aria-label="Excluir palpite"
            title="Excluir palpite"
            className="btn-danger size-10 min-h-10 px-0"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Excluir o palpite "${entry.name}"?`)) return;
              startTransition(async () => {
                await adminDeleteEntry(entry.id);
                router.refresh();
              });
            }}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <input
        aria-label="Nome do palpite"
        className="input font-semibold"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        required
      />
      <div className="flex gap-2">
        <select
          aria-label="Participante"
          className="input"
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
        >
          <option value="">— Sem participante —</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary shrink-0" disabled={pending || !dirty}>
          {pending ? "…" : saved ? "Salvo ✓" : "Salvar"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}

      <div className="flex flex-wrap gap-1">
        {badges.map((team, i) => (
          <TeamBadge key={i} team={team} size={22} />
        ))}
      </div>
    </form>
  );
}
