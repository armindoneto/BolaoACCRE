import { FileUp } from "lucide-react";
import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { EDITION_STATUS_LABEL, listEditions, type EditionStatus } from "@/lib/data";
import { duplicateEdition, setEditionStatus } from "../actions";

/** O próximo passo de cada estado da edição. */
const NEXT_STEP: Partial<Record<EditionStatus, { to: EditionStatus; label: string; confirm: string }>> = {
  draft: {
    to: "open_for_entries",
    label: "Abrir palpites",
    confirm: "Abrir os palpites? A página inicial do site passa a ser o convite para palpitar.",
  },
  open_for_entries: {
    to: "running",
    label: "Iniciar o bolão",
    confirm: "Iniciar o bolão? Os palpites são fechados e a classificação vira a página inicial.",
  },
  running: {
    to: "finished",
    label: "Encerrar o bolão",
    confirm: "Encerrar o bolão? Ele sai da página inicial e vai para o Histórico.",
  },
};

const STATUS_HELP: Record<EditionStatus, string> = {
  draft: "Não aparece no site.",
  open_for_entries: "Recebendo palpites. A página inicial é o convite para palpitar.",
  running: "Palpites fechados. A classificação é a página inicial.",
  finished: "No Histórico.",
};

export default async function EdicoesPage() {
  const editions = await listEditions();
  const nextSeason = Math.max(new Date().getFullYear(), ...editions.map((e) => e.season + 1));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Edições</h1>
        <Link href="/admin/edicoes/importar" className="btn-outline">
          <FileUp className="size-4" /> Importar bolão antigo
        </Link>
      </div>
      <ul className="grid items-start gap-2 lg:grid-cols-2">
        {editions.map((e) => {
          const next = e.importedResults ? undefined : NEXT_STEP[e.status];
          return (
            <li key={e.id} className="card space-y-3 p-3">
              <div>
                <p className="font-semibold">
                  {e.name}
                  <span className="chip ml-2 bg-primary-soft text-primary">{EDITION_STATUS_LABEL[e.status]}</span>
                  {e.importedResults && <span className="chip ml-1 bg-border/60 text-fg">importada</span>}
                </p>
                <p className="text-xs text-muted">
                  {e.competitionName} · {e.season} · {STATUS_HELP[e.status]}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {next && (
                  <ConfirmButton
                    action={setEditionStatus.bind(null, e.id, next.to)}
                    confirm={next.confirm}
                    className="btn-primary min-h-10"
                  >
                    {next.label}
                  </ConfirmButton>
                )}
                {!e.importedResults && (
                  <Link href={`/admin/resultados?edicao=${e.id}`} className="btn-outline min-h-10">Trabalhar nela</Link>
                )}
                <Link href={`/admin/edicoes/${e.id}`} className="btn-outline min-h-10">Editar</Link>
              </div>
            </li>
          );
        })}
      </ul>

      {editions.length > 0 && (
        <form action={duplicateEdition} className="card max-w-xl space-y-3 p-4">
          <h2 className="font-bold">Nova edição a partir de uma anterior</h2>
          <p className="text-sm text-muted">
            Copia as regras e os níveis. A nova edição nasce como rascunho, sem jogos e sem palpites, para você ajustar.
          </p>
          <div>
            <label className="label" htmlFor="sourceId">Copiar de</label>
            <select id="sourceId" name="sourceId" className="input">
              {editions
                .filter((e) => !e.importedResults)
                .map((e) => (
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
