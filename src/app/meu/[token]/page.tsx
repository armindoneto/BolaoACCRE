import { PartyPopper } from "lucide-react";
import { notFound } from "next/navigation";
import { saveTokenToAccount } from "@/app/actions";
import { MyEntries } from "@/components/my-entries";
import { PageTitle } from "@/components/page-title";
import { ShareLink } from "@/components/share-link";
import { getBundle, isDemoMode, repo } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meus palpites", robots: { index: false } };

export default async function MeuPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { token } = await params;
  const access = await repo().getByToken(token);
  const bundle = access ? await getBundle(access.editionId) : null;
  if (!access || !bundle) notFound();
  const isNew = (await searchParams).novo === "1";
  const url = `${await siteUrl()}/meu/${token}`;

  return (
    <div className="space-y-4">
      {isNew && (
        <div className="card flex items-center gap-3 border-primary/40 bg-primary-soft p-4">
          <PartyPopper className="size-7 shrink-0 text-primary" />
          <div>
            <p className="font-bold">Palpite enviado!</p>
            <p className="text-sm">Guarde o link abaixo: é por ele que você vê e muda seus palpites.</p>
          </div>
        </div>
      )}
      <PageTitle title={`Palpites de ${access.participantName}`} subtitle={bundle.edition.name} />

      <section className="card space-y-2 p-4">
        <h2 className="font-bold">Seu link pessoal</h2>
        <p className="text-sm text-muted">
          Não precisa de senha. Mande para você mesmo no WhatsApp para não perder.
        </p>
        <ShareLink url={url} message="Meus palpites no Bolão ACC-RE:" />
      </section>

      <MyEntries bundle={bundle} access={access} token={token} />

      {!isDemoMode() && (
        <form action={saveTokenToAccount.bind(null, token)} className="text-center">
          <button type="submit" className="cursor-pointer text-sm font-semibold text-primary">
            Prefere entrar com e-mail ou Google? Guardar na minha conta
          </button>
        </form>
      )}
    </div>
  );
}
