import Link from "next/link";
import { submitEntry } from "@/app/actions";
import { EmptyState, PageTitle } from "@/components/page-title";
import { PickForm } from "@/components/pick-form";
import { getUser } from "@/lib/auth";
import { entriesOpen, getCurrentBundle, repo } from "@/lib/data";
import { pickFormTiers } from "@/lib/pick-form-data";
import { dateTimeFmt } from "@/lib/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fazer palpite" };

export default async function PalpitePage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
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
  const { link } = await searchParams;
  const user = await getUser();
  // Quem já tem link pessoal (ou conta com cadastro) não precisa informar o nome de novo.
  const access = link
    ? await repo().getParticipantByToken(link)
    : user
      ? await repo().getParticipantByUser(user.id)
      : null;
  const token = link && access ? link : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageTitle
        title={access ? "Mais um palpite" : "Fazer palpite"}
        subtitle={
          <>
            {bundle.edition.name} · escolha <strong>1 time de cada nível</strong>
            {bundle.edition.entriesDeadline &&
              ` · até ${dateTimeFmt.format(new Date(bundle.edition.entriesDeadline))}`}
          </>
        }
      />
      {access && (
        <p className="card p-3 text-sm">
          Palpite de <strong>{access.name}</strong>.
        </p>
      )}
      <PickForm
        tiers={pickFormTiers(bundle)}
        askName={!access}
        submitLabel="Enviar palpite"
        onSave={submitEntry.bind(null, token)}
      />
      <p className="text-center text-sm">
        <Link href="/regras" className="font-semibold text-primary">Como funciona a pontuação?</Link>
      </p>
    </div>
  );
}
