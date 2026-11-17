import Link from "next/link";
import { submitEntry } from "@/app/actions";
import { EmptyState, PageTitle } from "@/components/page-title";
import { PickForm } from "@/components/pick-form";
import { entriesOpen, getCurrentBundle } from "@/lib/data";
import { pickFormTiers } from "@/lib/pick-form-data";
import { dateTimeFmt } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fazer palpite" };

export default async function PalpitePage() {
  const bundle = await getCurrentBundle();
  if (!bundle || !entriesOpen(bundle.edition)) {
    return (
      <EmptyState title="Os palpites não estão abertos">
        {bundle?.edition.status === "open_for_entries"
          ? "O prazo para palpitar já terminou."
          : "Quando o próximo bolão abrir, é aqui que você faz o seu palpite."}
        <p className="mt-3">
          <Link href="/" className="font-semibold text-primary">Ver a classificação</Link>
        </p>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageTitle
        title="Fazer palpite"
        subtitle={
          <>
            {bundle.edition.name} · dê um nome ao palpite e escolha <strong>1 time de cada nível</strong>
            {bundle.edition.entriesDeadline &&
              ` · até ${dateTimeFmt.format(new Date(bundle.edition.entriesDeadline))}`}
          </>
        }
      />
      <PickForm tiers={pickFormTiers(bundle)} submitLabel="Enviar palpite" onSave={submitEntry} />
      <p className="text-center text-sm">
        Quer fazer mais de um? É só enviar este e voltar aqui.{" "}
        <Link href="/regras" className="font-semibold text-primary">Como funciona a pontuação?</Link>
      </p>
    </div>
  );
}
