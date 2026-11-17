"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { importHistoricEdition, type HistoryImportForm, type HistoryImportResult } from "../../actions";

const TIERS_EXAMPLE = `1: Flamengo, Palmeiras
2: Cruzeiro, Mirassol
3: Fluminense, Botafogo`;

const POINTS_EXAMPLE = `1º turno
Flamengo
3,0	Vitória	1ª Rodada
0,5	Vitória fora de casa	1ª Rodada
1,0	Empate	2ª Rodada
Palmeiras
3,0	Vitória	1ª Rodada
2º turno
Flamengo
1,0	Empate	21ª Rodada
3,0	Vitória	22ª Rodada`;

const ENTRIES_EXAMPLE = `palpite	participante	N1	N2	N3	…	N10	pos 1	pts 1	pos 2	pts 2
João 1	João Silva	Flamengo	Cruzeiro	Botafogo	…	Remo	1	312,5	7	280
João 2	João Silva	Palmeiras	Mirassol	Fluminense	…	Chapecoense	12	270	1	305,5`;

export function ImportHistoryForm() {
  const [form, setForm] = useState<HistoryImportForm>({
    name: "",
    season: new Date().getFullYear() - 1,
    periods: "1º turno, 2º turno",
    tiersText: "",
    pointsText: "",
    entriesText: "",
  });
  const [result, setResult] = useState<HistoryImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof HistoryImportForm>(key: K, value: HistoryImportForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setResult(null); // qualquer mudança pede nova conferência
  };
  const run = (save: boolean) =>
    startTransition(async () => {
      try {
        setResult(await importHistoricEdition(form, save));
      } catch {
        setResult({ ok: false, errors: ["Não deu certo agora. Tente de novo."] });
      }
    });
  const checked = result?.ok === true && !result.saved;

  if (result?.ok && result.saved) {
    return (
      <div className="card space-y-3 border-primary/40 bg-primary-soft p-5">
        <p className="text-lg font-bold">{form.name} importado!</p>
        <p className="text-sm">
          {result.summary.entries} palpites e {result.summary.teams} times gravados. A edição já está no Histórico.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/historico/${result.editionId}`} className="btn-primary">Ver no histórico</Link>
          <Link href={`/admin/times?edicao=${result.editionId}`} className="btn-outline">Enviar escudos dos times</Link>
          <button type="button" className="btn-outline" onClick={() => window.location.reload()}>
            Importar outro
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(false);
      }}
    >
      <section className="card grid gap-3 p-4 sm:grid-cols-[1fr_7rem] lg:grid-cols-[1fr_7rem_1fr]">
        <div>
          <label className="label" htmlFor="h-name">Nome da edição</label>
          <input id="h-name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Brasileirão 2023" required />
        </div>
        <div>
          <label className="label" htmlFor="h-season">Temporada</label>
          <input id="h-season" type="number" className="input" value={form.season} onChange={(e) => set("season", Number(e.target.value))} required />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="label" htmlFor="h-periods">Etapas <span className="font-normal text-muted">(separadas por vírgula)</span></label>
          <input id="h-periods" className="input" value={form.periods} onChange={(e) => set("periods", e.target.value)} required />
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="card space-y-2 p-4">
            <label className="label" htmlFor="h-tiers">1. Níveis e times</label>
            <p className="text-sm text-muted">Uma linha por nível, com os times separados por vírgula.</p>
            <pre className="overflow-x-auto rounded-xl bg-bg p-3 text-[11px] leading-relaxed">{TIERS_EXAMPLE}</pre>
            <textarea
              id="h-tiers"
              spellCheck={false}
              className="input min-h-40 whitespace-pre py-2 font-mono text-xs"
              value={form.tiersText}
              onChange={(e) => set("tiersText", e.target.value)}
              placeholder="1: Time A, Time B"
              required
            />
          </section>

          <section className="card space-y-2 p-4">
            <label className="label" htmlFor="h-points">2. Pontos de cada time</label>
            <p className="text-sm text-muted">
              Escreva o <strong>nome da etapa</strong> numa linha, depois o <strong>nome do time</strong> e, embaixo, os
              lançamentos dele: <strong>pontos, descrição</strong> e, se quiser, um complemento (a rodada). A descrição
              aparece no site exatamente como você escrever; nenhuma regra é aplicada. O total do time é a soma dos
              lançamentos.
            </p>
            <pre className="overflow-x-auto rounded-xl bg-bg p-3 text-[11px] leading-relaxed">{POINTS_EXAMPLE}</pre>
            <textarea
              id="h-points"
              spellCheck={false}
              className="input min-h-72 whitespace-pre py-2 font-mono text-xs"
              value={form.pointsText}
              onChange={(e) => set("pointsText", e.target.value)}
              placeholder="Cole aqui os lançamentos, time por time"
              required
            />
          </section>
        </div>

        <section className="card space-y-2 p-4">
          <label className="label" htmlFor="h-entries">3. Palpites</label>
          <p className="text-sm text-muted">
            Uma linha por palpite: <strong>nome do palpite, participante</strong> e o time escolhido em cada nível, na
            ordem dos níveis. Depois, opcionais: <strong>pos 1, pos 2</strong> (posição final em cada etapa) e{" "}
            <strong>pts 1, pts 2</strong> (pontos, só para o site conferir a soma). Participantes que ainda não
            existem são cadastrados automaticamente.
          </p>
          <pre className="overflow-x-auto rounded-xl bg-bg p-3 text-[11px] leading-relaxed">{ENTRIES_EXAMPLE}</pre>
          <textarea
            id="h-entries"
            spellCheck={false}
            className="input min-h-72 whitespace-pre py-2 font-mono text-xs"
            value={form.entriesText}
            onChange={(e) => set("entriesText", e.target.value)}
            placeholder="Cole aqui a tabela de palpites, com o cabeçalho"
            required
          />
        </section>
      </div>

      {result && !result.ok && (
        <div role="alert" className="rounded-2xl bg-danger/10 p-4 text-sm text-danger">
          <p className="font-bold">
            {result.errors.length === 1 ? "Encontrei 1 problema:" : `Encontrei ${result.errors.length} problemas:`}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {result.errors.slice(0, 30).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          {result.errors.length > 30 && <p className="mt-1">… e mais {result.errors.length - 30}.</p>}
        </div>
      )}

      {checked && (
        <div className="card space-y-3 border-primary/40 p-4 text-sm">
          <p className="font-bold text-primary">Tudo certo. Confira antes de gravar:</p>
          <p>
            {result.summary.teams} times em {result.summary.tiers} níveis · {result.summary.entries} palpites ·{" "}
            {result.summary.participants.length} participantes
          </p>
          {result.summary.warnings.map((w) => (
            <p key={w} className="rounded-xl bg-warn-soft p-2.5 text-warn">
              <strong>Atenção:</strong> {w}
            </p>
          ))}
          {result.summary.newParticipants.length > 0 && (
            <p>
              <strong>Participantes novos, que serão cadastrados:</strong> {result.summary.newParticipants.join(", ")}.
              <span className="text-muted"> Se algum for alguém já cadastrado com outro nome, corrija na planilha antes de gravar.</span>
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {result.summary.periods.map((p) => (
              <div key={p.name} className="rounded-xl bg-bg p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{p.name}</p>
                <ul className="tabular mt-1 space-y-0.5">
                  {[...p.top, ...p.last].map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted">
                  {p.usesPositions
                    ? "Posições como vieram da planilha."
                    : "Posições calculadas pelo total de pontos (desempate pelo time do nível 1, depois nível 2…)."}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-4 z-10 grid gap-2 sm:grid-cols-2 lg:mx-auto lg:max-w-xl">
        <button type="submit" className="btn-outline min-h-14 text-base shadow-lg" disabled={pending}>
          {pending && !checked ? "Conferindo…" : "Conferir dados"}
        </button>
        <button type="button" className="btn-primary min-h-14 text-base shadow-lg" disabled={pending || !checked} onClick={() => run(true)}>
          {pending && checked ? "Gravando…" : "Gravar no histórico"}
        </button>
      </div>
    </form>
  );
}
