import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveTokenToAccount } from "@/app/actions";
import { MyEntries } from "@/components/my-entries";
import { PageTitle } from "@/components/page-title";
import { ShareLink } from "@/components/share-link";
import { getCurrentBundle, isDemoMode, repo } from "@/lib/data";
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
  const participant = await repo().getParticipantByToken(token);
  if (!participant) notFound();
  const bundle = await getCurrentBundle();
  const isNew = (await searchParams).novo === "1";
  const url = `${await siteUrl()}/meu/${token}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {isNew && (
        <div className="card flex items-center gap-3 border-primary/40 bg-primary-soft p-4">
          <PartyPopper className="size-7 shrink-0 text-primary" />
          <div>
            <p className="font-bold">Palpite enviado!</p>
            <p className="text-sm">Guarde o link abaixo: é por ele que você vê e muda seus palpites.</p>
          </div>
        </div>
      )}
      <PageTitle title={`Olá, ${participant.name}`} subtitle="Esta é a sua página pessoal no bolão." />

      <section className="card space-y-2 p-4">
        <h2 className="font-bold">Seu link pessoal</h2>
        <p className="text-sm text-muted">
          Não precisa de senha, e o mesmo link vale para os próximos bolões. Mande para você mesmo no WhatsApp
          para não perder.
        </p>
        <ShareLink url={url} message="Minha página no Bolão ACC-RE:" />
      </section>

      {bundle && <MyEntries bundle={bundle} participant={participant} token={token} />}

      <Link href={`/participante/${participant.id}`} className="btn-primary min-h-12 w-full">
        Ver meu perfil, pontuação e histórico
      </Link>

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
