import { EmptyState } from "@/components/page-title";
import { tiersOf } from "@/lib/view";
import { EditionHeader } from "../edition-header";
import { adminBundle } from "../shared";
import { TeamEditor } from "./team-editor";

export default async function AdminTimesPage({ searchParams }: { searchParams: Promise<{ edicao?: string }> }) {
  const bundle = await adminBundle((await searchParams).edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const withCrest = bundle.teams.filter((t) => t.crestUrl).length;

  return (
    <div className="space-y-4">
      <EditionHeader edition={bundle.edition} title="Times e escudos" />
      <p className="text-sm text-muted">
        {withCrest} de {bundle.teams.length} times com escudo. O escudo e os dados de um time valem para
        <strong> todas as edições</strong> em que ele aparece. Sem imagem, o site mostra um escudo desenhado com a
        sigla e as cores.
      </p>
      {bundle.teams.length === 0 ? (
        <EmptyState title="Esta edição ainda não tem times">Defina os níveis na aba Edições.</EmptyState>
      ) : (
        tiersOf(bundle).map((tier) => (
          <section key={tier}>
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Nível {tier}</h2>
            <div className="space-y-2">
              {bundle.teams
                .filter((t) => t.tier === tier)
                .map((t) => (
                  <TeamEditor
                    key={t.id}
                    team={{
                      id: t.id,
                      name: t.name,
                      shortName: t.shortName,
                      code: t.code,
                      color: t.color,
                      color2: t.color2,
                      crestUrl: t.crestUrl,
                    }}
                  />
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
