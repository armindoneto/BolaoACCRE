"use client";

import { Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TrophyRow } from "@/components/trophies";
import type { Participant } from "@/lib/data/types";
import type { Trophies } from "@/lib/trophy-types";
import {
  adminCreateParticipant,
  adminDeleteParticipant,
  adminRenameParticipant,
  type ActionResult,
} from "../actions";

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p
      role="status"
      className={
        result.ok
          ? "rounded-xl bg-primary-soft p-2.5 text-sm font-medium text-primary"
          : "rounded-xl bg-danger/10 p-2.5 text-sm font-medium text-danger"
      }
    >
      {result.ok ? result.message : result.error}
    </p>
  );
}

function useAction() {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult>, after?: () => void) =>
    startTransition(async () => {
      let r: ActionResult;
      try {
        r = await action();
      } catch {
        r = { ok: false, error: "Não deu certo agora. Tente de novo." };
      }
      setResult(r);
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  return { result, pending, run };
}

export function NewParticipantForm() {
  const [name, setName] = useState("");
  const { result, pending, run } = useAction();
  return (
    <form
      className="card space-y-2 p-3 sm:max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => adminCreateParticipant(name), () => setName(""));
      }}
    >
      <label htmlFor="new-participant" className="label">Cadastrar participante</label>
      <div className="flex gap-2">
        <input
          id="new-participant"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da pessoa"
          maxLength={60}
          required
        />
        <button type="submit" className="btn-primary shrink-0" disabled={pending}>
          <UserPlus className="size-4" /> Cadastrar
        </button>
      </div>
      <Feedback result={result} />
    </form>
  );
}

export function ParticipantCard({
  participant,
  editionId,
  subtitle,
  editions,
  trophies,
}: {
  participant: Participant;
  /** Edição em que o admin está trabalhando (para o botão "Novo palpite"). */
  editionId: string;
  /** Linha embaixo do nome: os palpites na edição filtrada, ou um resumo. */
  subtitle: string;
  /** Edições em que a pessoa tem palpite, com os nomes dos palpites. */
  editions: { name: string; entryNames: string[] }[];
  trophies: Trophies;
}) {
  const [name, setName] = useState(participant.name);
  const { result, pending, run } = useAction();

  return (
    <details className="card group">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{participant.name}</span>
          <span className="block truncate text-xs text-muted">
            {subtitle}
          </span>
        </span>
        <TrophyRow trophies={trophies} size={24} hideEmpty className="gap-1" />
        <span className="text-sm font-semibold text-primary group-open:hidden">Abrir</span>
      </summary>

      <div className="space-y-3 border-t border-border p-3">
        {editions.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {editions.map((e) => (
              <li key={e.name}>
                <span className="font-semibold">{e.name}:</span>{" "}
                <span className="text-muted">{e.entryNames.join(" · ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">Ainda sem palpites.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/admin/palpites/novo?edicao=${editionId}&participante=${participant.id}`} className="btn-primary">
            <Plus className="size-4" /> Novo palpite
          </Link>
          <Link href={`/participante/${participant.id}`} className="btn-outline">
            Ver perfil
          </Link>
        </div>

        <form
          className="space-y-1"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => adminRenameParticipant(participant.id, name));
          }}
        >
          <label className="label" htmlFor={`rename-${participant.id}`}>Nome</label>
          <div className="flex gap-2">
            <input
              id={`rename-${participant.id}`}
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
            />
            <button type="submit" className="btn-outline shrink-0" disabled={pending || name.trim() === participant.name}>
              Salvar
            </button>
          </div>
        </form>

        {participant.entryCount === 0 && (
          <button
            type="button"
            className="btn-danger w-full"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Excluir o cadastro de ${participant.name}?`)) {
                run(() => adminDeleteParticipant(participant.id));
              }
            }}
          >
            Excluir cadastro (sem palpites)
          </button>
        )}
        <Feedback result={result} />
      </div>
    </details>
  );
}
