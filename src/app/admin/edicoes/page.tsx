import Link from "next/link";
import { EDITION_STATUS_LABEL, listEditions } from "@/lib/data";
import { duplicateEdition } from "../actions";

export default async function EdicoesPage() {
  const editions = await listEditions();
  const nextSeason = Math.max(new Date().getFullYear(), ...editions.map((e) => e.season + 1));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Edições</h1>
      <ul className="space-y-2">
        {editions.map((e) => (
          <li key={e.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="font-semibold">{e.name}</p>
              <p className="text-xs text-muted">
                {e.competitionName} · {e.season} · {EDITION_STATUS_LABEL[e.status]}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/resultados?edicao=${e.id}`} className="btn-outline min-h-10">Trabalhar nela</Link>
              <Link href={`/admin/edicoes/${e.id}`} className="btn-primary min-h-10">Editar</Link>
            </div>
          </li>
        ))}
      </ul>

      {editions.length > 0 && (
        <form action={duplicateEdition} className="card space-y-3 p-4">
          <h2 className="font-bold">Nova edição a partir de uma anterior</h2>
          <p className="text-sm text-muted">
            Copia as regras e os níveis. A nova edição nasce como rascunho, sem jogos e sem palpites, para você ajustar.
          </p>
          <div>
            <label className="label" htmlFor="sourceId">Copiar de</label>
            <select id="sourceId" name="sourceId" className="input">
              {editions.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <div>
              <label className="label" htmlFor="name">Nome</label>
              <input id="name" name="name" className="input" required placeholder={`Brasileirão ${nextSeason}`} />
            </div>
            <div>
              <label className="label" htmlFor="season">Temporada</label>
              <input id="season" name="season" type="number" className="input" required defaultValue={nextSeason} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">Criar edição</button>
        </form>
      )}
    </div>
  );
}
