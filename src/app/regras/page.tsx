import { EmptyState, PageTitle } from "@/components/page-title";
import { TeamBadge } from "@/components/team-badge";
import { getCurrentBundle } from "@/lib/data";
import { describeRules } from "@/lib/scoring";
import { cn } from "@/lib/cn";
import { tiersOf } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Regras" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-2 font-bold">{title}</h2>
      {children}
    </section>
  );
}

function PointsList({ items }: { items: { text: string; points: string }[] }) {
  return (
    <ul className="divide-y divide-border/60 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2">
          <span>{item.text}</span>
          <span
            className={cn(
              "chip tabular shrink-0 text-sm",
              item.points.startsWith("−") ? "bg-danger/10 text-danger" : "bg-primary-soft text-primary",
            )}
          >
            {item.points}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function RegrasPage() {
  const bundle = await getCurrentBundle();
  if (!bundle) return <EmptyState title="Nenhum bolão em andamento" />;
  const { edition } = bundle;
  const d = describeRules(edition.rules);
  const tiers = tiersOf(bundle);

  return (
    <div className="space-y-4">
      <PageTitle title="Regras" subtitle={edition.name} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">

      <Section title="Como funciona">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Cada palpite escolhe <strong>1 time de cada nível</strong> ({tiers.length} times no total).</li>
          <li>O palpite vale até o fim do campeonato e não pode ser trocado depois do prazo.</li>
          <li>A pontuação do palpite é a <strong>soma dos pontos dos seus times</strong>.</li>
          <li>Você pode fazer mais de um palpite.</li>
          {d.periods.length > 1 && (
            <li>
              São {d.periods.length} etapas, cada uma com premiação própria. No começo de cada etapa
              <strong> tudo zera</strong>: a classificação do bolão e a tabela do campeonato.
            </li>
          )}
          <li>Jogo adiado conta para o turno da rodada original, mesmo se for disputado depois.</li>
        </ul>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {d.periods.map((p) => (
            <li key={p} className="chip bg-border/60 text-fg">{p}</li>
          ))}
        </ul>
      </Section>

      <Section title="Níveis">
        <ul className="grid gap-x-4 text-sm sm:grid-cols-2">
          {tiers.map((tier) => (
            <li key={tier} className="flex items-center gap-2 border-b border-border/60 py-1.5">
              <span className="w-14 shrink-0 text-xs font-bold uppercase text-muted">Nível {tier}</span>
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {bundle.teams
                  .filter((t) => t.tier === tier)
                  .map((t) => (
                    <span key={t.id} className="flex items-center gap-1.5">
                      <TeamBadge team={t} size={20} /> {t.shortName}
                    </span>
                  ))}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      </div>
      <div className="space-y-4">
      <Section title="Pontos por jogo">
        <p className="mb-1 text-sm text-muted">Os pontos se somam: uma vitória por goleada fora de casa ganha os três.</p>
        <PointsList items={d.matchRules} />
      </Section>

      {d.periodEndRules.length > 0 && (
        <Section title="Pontos no fim do turno">
          <p className="mb-1 text-sm text-muted">
            Contam pela tabela só dos jogos do turno, e só entram quando todos os jogos do turno tiverem acontecido.
          </p>
          <PointsList items={d.periodEndRules} />
        </Section>
      )}

      <Section title="Desempate">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {d.tiebreakers.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </Section>

      <Section title="Premiação">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {d.prizes.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {edition.prizesText && (
          <p className="mt-3 whitespace-pre-line rounded-xl bg-primary-soft p-3 text-sm">{edition.prizesText}</p>
        )}
      </Section>
      </div>
      </div>
    </div>
  );
}
