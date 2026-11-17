"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TeamBadge, type BadgeTeam } from "@/components/team-badge";
import { cn } from "@/lib/cn";
import { adminDeleteEntry, adminReviewEntry } from "../actions";
import { LinkButton } from "./link-button";

/** Um palpite na lista do admin: ajustar o nome e atribuir a um participante, ali mesmo. */
export function ReviewRow({
  editionId,
  entry,
  participants,
  repeated,
  badges,
}: {
  editionId: string;
  entry: { id: string; name: string; participantId: string | null };
  participants: { id: string; name: string }[];
  repeated: boolean;
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
          {repeated && <span className="chip bg-border/60 text-fg">times repetidos</span>}
        </div>
        <div className="flex shrink-0 gap-1">
          <LinkButton entryId={entry.id} />
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
