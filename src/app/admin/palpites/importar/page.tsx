import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/page-title";
import { tiersOf } from "@/lib/view";
import { EditionHeader } from "../../edition-header";
import { adminBundle } from "../../shared";
import { ImportEntriesForm } from "./import-form";

/** Ferramenta de uso único: lançar de uma vez os palpites já feitos de uma edição. */
export default async function ImportarPalpitesPage({ searchParams }: { searchParams: Promise<{ edicao?: string }> }) {
  const bundle = await adminBundle((await searchParams).edicao);
  if (!bundle) return <EmptyState title="Nenhuma edição cadastrada" />;
  const tiers = tiersOf(bundle).length;

  return (
    <div className="space-y-4">
      <Link href={`/admin/palpites?edicao=${bundle.edition.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ChevronLeft className="size-4" /> Palpites
      </Link>
      <EditionHeader edition={bundle.edition} title="Importar palpites" />
      <section className="card max-w-4xl space-y-2 p-4 text-sm">
        <p>
          Cole a lista copiada do Excel, um palpite por linha: <strong>nome do palpite, participante</strong> e o time
          de cada nível, do nível 1 ao {tiers}. Os palpites entram em <strong>{bundle.edition.name}</strong>.
        </p>
        <pre className="overflow-x-auto rounded-xl bg-bg p-3 text-xs">
          João 1{"\t"}João Silva{"\t"}Flamengo{"\t"}Cruzeiro{"\t"}…{"\t"}Remo{"\n"}
          João 2{"\t"}João Silva{"\t"}Palmeiras{"\t"}Mirassol{"\t"}…{"\t"}Chapecoense
        </pre>
        <ul className="list-disc space-y-0.5 pl-5 text-muted">
          <li>Os times podem ser escritos pelo nome, nome curto ou sigla.</li>
          <li>Participantes que ainda não existem são cadastrados ao gravar (o resumo mostra quais).</li>
          <li>Com o participante vazio, o palpite entra sem dono, para atribuir depois na lista de palpites.</li>
        </ul>
      </section>
      <ImportEntriesForm editionId={bundle.edition.id} />
      <p className="text-xs text-muted">
        Times desta edição:{" "}
        {tiersOf(bundle)
          .map((tier) => `${tier}: ${bundle.teams.filter((t) => t.tier === tier).map((t) => t.shortName).join(" / ")}`)
          .join(" · ")}
      </p>
    </div>
  );
}
