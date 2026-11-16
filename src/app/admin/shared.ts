import { getBundle, listEditions, pickCurrentEdition, type EditionBundle } from "@/lib/data";

/** Edição em que o admin está trabalhando: ?edicao= ou a atual (ou a mais recente, mesmo em rascunho). */
export async function adminBundle(requested: string | undefined): Promise<EditionBundle | null> {
  const editions = await listEditions();
  const chosen =
    editions.find((e) => e.id === requested) ?? pickCurrentEdition(editions) ?? editions[0] ?? null;
  return chosen ? getBundle(chosen.id) : null;
}
