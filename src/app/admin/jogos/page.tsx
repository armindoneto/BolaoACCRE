import { EmptyState } from "@/components/page-title";
import { EditionHeader } from "../edition-header";
import { adminBundle } from "../shared";
import { ImportForm } from "./import-form";

export default async function JogosPage({ searchParams }: { searchParams: Promise<{ edicao?: string }> }) {
  const bundle = await adminBundle((await searchParams).edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const rounds = new Set(bundle.matches.map((m) => m.round));
  const withResult = bundle.matches.filter((m) => m.homeGoals !== null).length;

  return (
    <div className="space-y-4">
      <EditionHeader edition={bundle.edition} title="Tabela de jogos" />
      <p className="card p-3 text-sm">
        {bundle.matches.length === 0
          ? "Nenhum jogo cadastrado ainda."
          : `${bundle.matches.length} jogos em ${rounds.size} rodadas, ${withResult} com resultado.`}
      </p>
      <section className="card max-w-3xl space-y-3 p-4">
        <h2 className="font-bold">Importar por CSV</h2>
        <div className="space-y-1 text-sm text-muted">
          <p>Cole a tabela inteira da temporada, um jogo por linha:</p>
          <pre className="overflow-x-auto rounded-xl bg-bg p-3 text-xs text-fg">
            rodada;data;mandante;visitante;gols mandante;gols visitante{"\n"}
            1;28/03/2026 16:00;Flamengo;Santos;2;0{"\n"}
            1;28/03/2026 18:30;Remo;Bahia
          </pre>
          <p>
            Data e gols são opcionais. Os times podem ser escritos pelo nome ou pela sigla. A importação
            <strong> substitui a tabela inteira</strong>, mas mantém os resultados já lançados dos jogos que continuarem iguais.
          </p>
        </div>
        <ImportForm editionId={bundle.edition.id} />
        <p className="text-xs text-muted">
          Times desta edição: {bundle.teams.map((t) => `${t.name} (${t.code})`).join(", ")}.
        </p>
      </section>
    </div>
  );
}
