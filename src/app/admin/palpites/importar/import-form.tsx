"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { importEntries, type EntriesImportResult } from "./actions";

export function ImportEntriesForm({ editionId }: { editionId: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<EntriesImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const checked = result?.ok === true && !result.saved;
  const run = (save: boolean) =>
    startTransition(async () => {
      try {
        setResult(await importEntries(editionId, text, save));
      } catch {
        setResult({ ok: false, errors: ["Não deu certo agora. Tente de novo."] });
      }
    });

  if (result?.ok && result.saved) {
    return (
      <div className="card max-w-4xl space-y-3 border-primary/40 bg-primary-soft p-5">
        <p className="text-lg font-bold">{result.summary.entries} palpites importados!</p>
        {result.summary.newParticipants.length > 0 && (
          <p className="text-sm">
            {result.summary.newParticipants.length === 1
              ? "1 participante novo foi cadastrado."
              : `${result.summary.newParticipants.length} participantes novos foram cadastrados.`}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/palpites?edicao=${editionId}`} className="btn-primary">Ver os palpites</Link>
          <Link href="/" className="btn-outline">Ver a classificação</Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="max-w-4xl space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(false);
      }}
    >
      <textarea
        spellCheck={false}
        aria-label="Lista de palpites"
        className="input min-h-80 whitespace-pre py-2 font-mono text-xs"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null); // qualquer mudança pede nova conferência
        }}
        placeholder="Cole aqui a lista de palpites"
        required
      />

      {result && !result.ok && (
        <div role="alert" className="rounded-2xl bg-danger/10 p-4 text-sm text-danger">
          <p className="font-bold">
            {result.errors.length === 1 ? "Encontrei 1 problema:" : `Encontrei ${result.errors.length} problemas:`}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {result.errors.slice(0, 40).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          {result.errors.length > 40 && <p className="mt-1">… e mais {result.errors.length - 40}.</p>}
        </div>
      )}

      {checked && (
        <div className="card space-y-2 border-primary/40 p-4 text-sm">
          <p className="font-bold text-primary">Tudo certo. Confira antes de gravar:</p>
          <p>
            {result.summary.entries} palpites de {result.summary.participants} participantes.
          </p>
          {result.summary.newParticipants.length > 0 && (
            <p>
              <strong>Participantes novos, que serão cadastrados:</strong> {result.summary.newParticipants.join(", ")}.
              <span className="text-muted"> Se algum já está cadastrado com outro nome, corrija na lista antes de gravar.</span>
            </p>
          )}
          {result.summary.withoutParticipant.length > 0 && (
            <p>
              <strong>Sem participante</strong> (atribua depois na lista de palpites):{" "}
              {result.summary.withoutParticipant.join(", ")}.
            </p>
          )}
          {result.summary.repeated.length > 0 && (
            <p className="rounded-xl bg-warn-soft p-2.5 text-warn">
              <strong>Palpites com exatamente os mesmos times</strong> (não impede; se terminarem empatados, dividem a
              posição): {result.summary.repeated.map((g) => g.join(" = ")).join("; ")}.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="submit" className="btn-outline min-h-12" disabled={pending || !text.trim()}>
          {pending && !checked ? "Conferindo…" : "Conferir dados"}
        </button>
        <button type="button" className="btn-primary min-h-12" disabled={pending || !checked} onClick={() => run(true)}>
          {pending && checked ? "Gravando…" : "Gravar palpites"}
        </button>
      </div>
    </form>
  );
}
