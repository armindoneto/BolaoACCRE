"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import type { EntryPayload, SaveResult } from "@/lib/entries";
import { TeamBadge, type BadgeTeam } from "./team-badge";

export interface PickFormTier {
  tier: number;
  teams: (BadgeTeam & { id: string; shortName: string })[];
}

/**
 * Formulário de palpite: um time por nível, botões grandes.
 * Se já existir um palpite idêntico, mostra um aviso amigável que não bloqueia.
 */
export function PickForm({
  tiers,
  askName,
  initial,
  submitLabel,
  onSave,
  nameSuggestions,
}: {
  tiers: PickFormTier[];
  askName: boolean;
  initial?: { name?: string; nickname?: string | null; picks?: Record<number, string> };
  submitLabel: string;
  onSave: (payload: EntryPayload) => Promise<SaveResult>;
  nameSuggestions?: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [picks, setPicks] = useState<Record<number, string>>(initial?.picks ?? {});
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [pending, startTransition] = useTransition();

  const missing = tiers.filter((t) => !picks[t.tier]).length;
  const chosen = tiers.length - missing;

  function save(confirmDuplicate: boolean) {
    setError(null);
    if (askName && name.trim().length < 2) {
      setError("Escreva seu nome para continuar.");
      document.getElementById("pick-name")?.focus();
      return;
    }
    if (missing > 0) {
      setError(missing === 1 ? "Falta escolher 1 time." : `Faltam ${missing} times para escolher.`);
      return;
    }
    startTransition(async () => {
      try {
        const result = await onSave({ name, nickname, picks, confirmDuplicate });
        if (result.ok) {
          setDuplicate(false);
          if (result.redirectTo) router.push(result.redirectTo);
          router.refresh();
        } else if ("duplicate" in result) {
          setDuplicate(true);
        } else {
          setDuplicate(false);
          setError(result.error);
        }
      } catch {
        setError("Não deu certo agora. Tente de novo em instantes.");
      }
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
    >
      <div className="card space-y-3 p-4">
        {askName && (
          <div>
            <label htmlFor="pick-name" className="label">Seu nome</label>
            <input
              id="pick-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como o pessoal te conhece"
              autoComplete="name"
              maxLength={60}
              list={nameSuggestions ? "pick-names" : undefined}
            />
            {nameSuggestions && (
              <datalist id="pick-names">
                {nameSuggestions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            )}
          </div>
        )}
        <div>
          <label htmlFor="pick-nickname" className="label">
            Apelido do palpite <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="pick-nickname"
            className="input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ex.: Palpite da sorte"
            maxLength={40}
          />
        </div>
      </div>

      <div className="space-y-3">
        {tiers.map(({ tier, teams }) => (
          <fieldset key={tier} className="card p-3">
            <legend className="float-left mb-2 w-full text-xs font-bold uppercase tracking-wide text-muted">
              Nível {tier}
            </legend>
            <div className={cn("clear-both grid gap-2", teams.length > 2 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
              {teams.map((team) => {
                const selected = picks[tier] === team.id;
                return (
                  <button
                    key={team.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setPicks((p) => ({ ...p, [tier]: team.id }));
                      setDuplicate(false);
                      setError(null);
                    }}
                    className={cn(
                      "relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 text-sm font-semibold transition",
                      selected
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-fg">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    )}
                    <TeamBadge team={team} size={34} />
                    <span className="text-center leading-tight">{team.shortName}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {duplicate && (
        <div role="alertdialog" className="card space-y-3 border-warn/40 bg-warn-soft p-4 text-sm">
          <p className="font-bold text-warn">Já existe um palpite com exatamente esses times.</p>
          <p>Se terminarem empatados, dividem a posição e o prêmio. Quer manter ou trocar algum time?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-outline" onClick={() => setDuplicate(false)} disabled={pending}>
              Trocar um time
            </button>
            <button type="button" className="btn-primary" onClick={() => save(true)} disabled={pending}>
              {pending ? "Enviando…" : "Manter assim"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {!duplicate && (
        <div className="sticky bottom-20 z-10 sm:bottom-4">
          <button type="submit" className="btn-primary min-h-14 w-full text-base shadow-lg" disabled={pending}>
            {pending ? "Enviando…" : `${submitLabel} (${chosen}/${tiers.length})`}
          </button>
        </div>
      )}
    </form>
  );
}
