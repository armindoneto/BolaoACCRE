"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { TeamBadge } from "@/components/team-badge";
import { adminCreateTeam, type ActionResult, type TeamForm } from "../actions";
import { ListFilter, normalizeSearch, type EditionOption } from "../list-filter";
import { TeamEditor } from "./team-editor";

export interface CatalogItem extends TeamForm {
  id: string;
  crestUrl: string | null;
  editions: { editionId: string; name: string; tier: number }[];
}

/** Gera a sigla a partir do nome enquanto a pessoa não escreve uma. */
const suggestCode = (name: string) => normalizeSearch(name).replace(/[^a-z0-9]/g, "").slice(0, 3).toUpperCase();

function NewTeamForm() {
  const router = useRouter();
  const empty: TeamForm = { name: "", shortName: "", code: "", color: "#334155", color2: "#ffffff" };
  const [form, setForm] = useState(empty);
  const [codeTouched, setCodeTouched] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const code = codeTouched ? form.code : suggestCode(form.name);
  const set = (key: keyof TeamForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setResult(null);
  };

  return (
    <details className="card group">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 font-semibold text-primary [&::-webkit-details-marker]:hidden">
        <Plus className="size-4" /> Cadastrar time
      </summary>
      <form
        className="space-y-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await adminCreateTeam({ ...form, code });
            setResult(r);
            if (r.ok) {
              setForm(empty);
              setCodeTouched(false);
              router.refresh();
            }
          });
        }}
      >
        <div className="flex items-center gap-3">
          <TeamBadge team={{ name: form.name || "Novo time", code: code || "?", crestUrl: null, color: form.color, color2: form.color2 }} size={40} />
          <div className="min-w-0 flex-1">
            <label className="label" htmlFor="new-team-name">Nome</label>
            <input id="new-team-name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Sport Club do Recife" maxLength={60} required />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <div>
            <label className="label" htmlFor="new-team-short">Nome curto <span className="font-normal text-muted">(opcional)</span></label>
            <input id="new-team-short" className="input" value={form.shortName} onChange={(e) => set("shortName", e.target.value)} placeholder="Ex.: Sport" maxLength={24} />
          </div>
          <div>
            <label className="label" htmlFor="new-team-code">Sigla</label>
            <input
              id="new-team-code"
              className="input uppercase"
              value={code}
              onChange={(e) => {
                setCodeTouched(true);
                set("code", e.target.value.toUpperCase().slice(0, 4));
              }}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="new-team-c1">Cor principal</label>
            <input id="new-team-c1" type="color" className="input p-1" value={form.color} onChange={(e) => set("color", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="new-team-c2">Cor secundária</label>
            <input id="new-team-c2" type="color" className="input p-1" value={form.color2} onChange={(e) => set("color2", e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted">O escudo pode ser enviado depois de cadastrar.</p>
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Cadastrando…" : "Cadastrar time"}
        </button>
        {result && (
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
        )}
      </form>
    </details>
  );
}

/** Cadastro geral de times: busca, filtro por edição, cadastro e edição de cada time. */
export function TeamCatalog({
  teams,
  editions,
}: {
  teams: CatalogItem[];
  /** Todas as edições, da mais recente para a mais antiga. */
  editions: EditionOption[];
}) {
  const [query, setQuery] = useState("");
  // Abre com todos: um time recém-cadastrado ainda não está em nenhuma edição.
  const [editionId, setEditionId] = useState("");
  const shown = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return teams.filter((t) => {
      if (editionId && !t.editions.some((e) => e.editionId === editionId)) return false;
      return !q || normalizeSearch(`${t.name} ${t.shortName} ${t.code}`).includes(q);
    });
  }, [teams, query, editionId]);

  return (
    <div className="space-y-3">
      <NewTeamForm />
      <ListFilter
        query={query}
        onQuery={setQuery}
        editionId={editionId}
        onEdition={setEditionId}
        editions={editions}
        placeholder="Buscar time"
        count={shown.length}
      />
      {shown.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">Nenhum time encontrado.</p>
      ) : (
        <ul className="grid items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((t) => (
            <li key={t.id}>
              <TeamEditor
                team={{ id: t.id, name: t.name, shortName: t.shortName, code: t.code, color: t.color, color2: t.color2, crestUrl: t.crestUrl }}
                editions={t.editions}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
