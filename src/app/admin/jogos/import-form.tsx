"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importMatches, type ActionResult } from "../actions";

export function ImportForm({ editionId }: { editionId: string }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm("Substituir a tabela de jogos desta edição?")) return;
        startTransition(async () => {
          const r = await importMatches(editionId, csv);
          setResult(r);
          if (r.ok) {
            setCsv("");
            router.refresh();
          }
        });
      }}
    >
      <input
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-semibold file:text-primary"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) setCsv(await file.text());
        }}
      />
      <textarea
        className="input min-h-40 py-2 font-mono text-xs"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="…ou cole o texto aqui"
        required
      />
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
      <button type="submit" className="btn-primary w-full" disabled={pending || !csv.trim()}>
        {pending ? "Importando…" : "Importar jogos"}
      </button>
    </form>
  );
}
