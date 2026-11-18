import { listEditions, repo } from "@/lib/data";
import { TeamCatalog } from "./team-catalog";

/** Cadastro geral de times: cada time pode estar em várias edições, ou em nenhuma. */
export default async function AdminTimesPage() {
  const [teams, editions] = await Promise.all([repo().listTeams(), listEditions()]);
  const editionName = new Map(editions.map((e) => [e.id, e]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Times</h1>
      <TeamCatalog
        editions={[...editions]
          .sort((a, b) => b.season - a.season || a.name.localeCompare(b.name))
          .map((e) => ({ id: e.id, name: e.name }))}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          shortName: t.shortName,
          code: t.code,
          color: t.color,
          color2: t.color2,
          crestUrl: t.crestUrl,
          editions: t.editions
            .map((e) => ({ editionId: e.editionId, tier: e.tier, edition: editionName.get(e.editionId) }))
            .filter((e) => e.edition)
            .sort((a, b) => b.edition!.season - a.edition!.season)
            .map((e) => ({ editionId: e.editionId, name: e.edition!.name, tier: e.tier })),
        }))}
      />
    </div>
  );
}
