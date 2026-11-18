"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { EDITION_STATUS_LABEL, type EditionStatus } from "@/lib/data/types";
import { describeRules } from "@/lib/scoring/describe";
import { parseRules } from "@/lib/scoring/schema";
import { saveEdition, type ActionResult, type EditionForm as FormData } from "../../actions";
import { TierEditor, type CatalogOption } from "./tier-editor";

export function EditionForm({
  editionId,
  initial,
  locked,
  periods,
  catalog,
}: {
  editionId: string;
  initial: FormData;
  /** true quando já há jogos ou palpites: os níveis não podem mais mudar. */
  locked: boolean;
  periods: { id: string; name: string }[];
  /** Cadastro geral de times, para escolher os de cada nível. */
  catalog: CatalogOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setResult(null);
  };

  // Validação e pré-visualização das regras, a cada tecla.
  const preview = useMemo(() => {
    try {
      const parsed = parseRules(JSON.parse(form.rulesJson));
      return parsed.ok
        ? { ok: true as const, text: describeRules(parsed.rules) }
        : { ok: false as const, errors: parsed.errors };
    } catch (e) {
      return { ok: false as const, errors: [`JSON inválido: ${(e as Error).message}`] };
    }
  }, [form.rulesJson]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveEdition(editionId, form);
          setResult(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
      <section className="card space-y-3 p-4">
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <div>
            <label className="label" htmlFor="ed-name">Nome</label>
            <input id="ed-name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="ed-season">Temporada</label>
            <input
              id="ed-season"
              type="number"
              className="input"
              value={form.season}
              onChange={(e) => set("season", Number(e.target.value))}
              required
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ed-status">Situação</label>
          <select id="ed-status" className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {(Object.keys(EDITION_STATUS_LABEL) as EditionStatus[]).map((s) => (
              <option key={s} value={s}>{EDITION_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Rascunho não aparece no site. &ldquo;Palpites abertos&rdquo; libera o formulário (e esconde os times de cada um).
            &ldquo;Em andamento&rdquo; trava os palpites e mostra a classificação. &ldquo;Encerrada&rdquo; manda para o histórico.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="ed-deadline">
            Prazo dos palpites <span className="font-normal text-muted">(horário de Brasília, opcional)</span>
          </label>
          <input
            id="ed-deadline"
            type="datetime-local"
            className="input"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="ed-prizes">
            Prêmios <span className="font-normal text-muted">(texto livre, aparece nas regras)</span>
          </label>
          <textarea
            id="ed-prizes"
            className="input min-h-20 py-2"
            value={form.prizesText}
            onChange={(e) => set("prizesText", e.target.value)}
          />
        </div>
      </section>

      <section className="card space-y-2 p-4">
        <p className="label">Níveis e times</p>
        <TierEditor catalog={catalog} value={form.tiers} onChange={(tiers) => set("tiers", tiers)} locked={locked} />
      </section>

      </div>
      <div className="space-y-4">
      <section className="card space-y-2 p-4">
        <label className="label" htmlFor="ed-rules">Regras (JSON)</label>
        <textarea
          id="ed-rules"
          spellCheck={false}
          className="input min-h-80 py-2 font-mono text-xs"
          value={form.rulesJson}
          onChange={(e) => set("rulesJson", e.target.value)}
        />
        {preview.ok ? (
          <div className="space-y-2 rounded-xl bg-primary-soft p-3 text-sm">
            <p className="font-bold text-primary">Regras válidas. É assim que elas aparecem no site:</p>
            <p>{preview.text.periods.join(" · ")}</p>
            <ul className="list-disc pl-5">
              {[...preview.text.matchRules, ...preview.text.periodEndRules].map((r, i) => (
                <li key={i}>{r.text}: <strong>{r.points}</strong></li>
              ))}
            </ul>
            <ol className="list-decimal pl-5">
              {preview.text.tiebreakers.map((t) => <li key={t}>{t}</li>)}
            </ol>
            <p>{preview.text.prizes[0]}</p>
          </div>
        ) : (
          <ul className="list-disc space-y-1 rounded-xl bg-danger/10 p-3 pl-7 text-sm text-danger">
            {preview.errors.map((err) => <li key={err}>{err}</li>)}
          </ul>
        )}
      </section>

      </div>
      </div>

      <details className="card p-4">
        <summary className="cursor-pointer font-bold">Desempate manual da tabela (raro)</summary>
        <p className="mt-2 text-sm text-muted">
          Só para quando dois times terminam iguais em pontos, vitórias, saldo, gols pró e confronto direto
          (cartões ou sorteio decidem). Escreva os times na ordem correta, um por linha.
        </p>
        {periods.map((p) => (
          <div key={p.id} className="mt-3">
            <label className="label" htmlFor={`order-${p.id}`}>{p.name}</label>
            <textarea
              id={`order-${p.id}`}
              className="input min-h-20 py-2 text-sm"
              value={form.manualOrder[p.id] ?? ""}
              onChange={(e) => set("manualOrder", { ...form.manualOrder, [p.id]: e.target.value })}
            />
          </div>
        ))}
      </details>

      {result && (
        <p
          role="status"
          className={
            result.ok
              ? "rounded-xl bg-primary-soft p-3 text-sm font-medium text-primary"
              : "whitespace-pre-line rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger"
          }
        >
          {result.ok ? result.message : result.error}
        </p>
      )}
      <div className="sticky bottom-4 z-10 lg:mx-auto lg:max-w-md">
        <button type="submit" className="btn-primary min-h-14 w-full text-base shadow-lg" disabled={pending || !preview.ok}>
          {pending ? "Salvando…" : "Salvar edição"}
        </button>
      </div>
    </form>
  );
}
