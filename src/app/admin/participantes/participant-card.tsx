"use client";

import { Link2, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TrophyRow } from "@/components/trophies";
import type { Participant } from "@/lib/data/types";
import type { Trophies } from "@/lib/trophy-types";
import {
  adminCreateParticipant,
  adminDeleteParticipant,
  adminMergeParticipants,
  adminParticipantLink,
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
  inEdition,
  trophies,
  others,
}: {
  participant: Participant;
  editionId: string;
  inEdition: number;
  trophies: Trophies;
  others: { id: string; name: string }[];
}) {
  const [name, setName] = useState(participant.name);
  const [mergeInto, setMergeInto] = useState("");
  const [copied, setCopied] = useState(false);
  const { result, pending, run } = useAction();

  async function copyLink() {
    const url = await adminParticipantLink(participant.id);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Link pessoal do participante:", url);
    }
  }

  return (
    <details className="card group">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{participant.name}</span>
          <span className="text-xs text-muted">
            {inEdition} nesta edição · {participant.entryCount} no total
            {participant.hasAccount && " · tem conta"}
          </span>
        </span>
        <TrophyRow trophies={trophies} size={24} hideEmpty className="gap-1" />
        <span className="text-sm font-semibold text-primary group-open:hidden">Abrir</span>
      </summary>

      <div className="space-y-3 border-t border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/admin/palpites/novo?edicao=${editionId}&participante=${participant.id}`} className="btn-primary">
            <Plus className="size-4" /> Novo palpite
          </Link>
          <button type="button" className="btn-outline" onClick={copyLink}>
            <Link2 className="size-4" /> {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>
        <Link href={`/participante/${participant.id}`} className="block text-sm font-semibold text-primary">
          Ver perfil público
        </Link>

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

        <form
          className="space-y-1"
          onSubmit={(e) => {
            e.preventDefault();
            const target = others.find((o) => o.id === mergeInto);
            if (!target) return;
            if (
              !window.confirm(
                `Juntar "${participant.name}" em "${target.name}"? Os palpites passam para ${target.name} e o cadastro "${participant.name}" deixa de existir. Não dá para desfazer.`,
              )
            )
              return;
            run(() => adminMergeParticipants(participant.id, mergeInto));
          }}
        >
          <label className="label" htmlFor={`merge-${participant.id}`}>É a mesma pessoa que…</label>
          <div className="flex gap-2">
            <select
              id={`merge-${participant.id}`}
              className="input"
              value={mergeInto}
              onChange={(e) => setMergeInto(e.target.value)}
            >
              <option value="">Escolha…</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <button type="submit" className="btn-outline shrink-0" disabled={pending || !mergeInto}>
              Juntar
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
