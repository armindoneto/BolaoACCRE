import Link from "next/link";
import { signOut } from "@/app/actions";
import { MyEntries } from "@/components/my-entries";
import { EmptyState, PageTitle } from "@/components/page-title";
import { getUser } from "@/lib/auth";
import { entriesOpen, getCurrentBundle, isDemoMode, repo } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meus palpites" };

export default async function MeusPalpitesPage() {
  const user = await getUser();
  const bundle = await getCurrentBundle();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <PageTitle title="Meus palpites" />
        <section className="card space-y-3 p-4 text-sm">
          <p>
            <strong>Fez o palpite sem conta?</strong> Abra o link pessoal que você recebeu ao enviar o palpite
            (procure no seu WhatsApp por &ldquo;Meus palpites no Bolão ACC-RE&rdquo;).
          </p>
          <p className="text-muted">Perdeu o link? Peça para o organizador do bolão mandar de novo.</p>
          {!isDemoMode() && (
            <Link href="/entrar?next=/meus-palpites" className="btn-primary w-full">
              Entrar com e-mail ou Google
            </Link>
          )}
          {bundle && entriesOpen(bundle.edition) && (
            <Link href="/palpite" className="btn-outline w-full">Fazer um palpite</Link>
          )}
        </section>
      </div>
    );
  }

  const participant = await repo().getParticipantByUser(user.id);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="Meus palpites" subtitle={user.email ?? undefined}>
        <form action={signOut}>
          <button type="submit" className="btn-outline">Sair</button>
        </form>
      </PageTitle>
      {participant ? (
        <>
          {bundle && <MyEntries bundle={bundle} participant={participant} token={null} />}
          <Link href={`/participante/${participant.id}`} className="btn-primary min-h-12 w-full">
            Ver meu perfil, pontuação e histórico
          </Link>
        </>
      ) : (
        <EmptyState title="Nenhum palpite nesta conta">
          {bundle && entriesOpen(bundle.edition) ? (
            <Link href="/palpite" className="btn-primary mt-2">Fazer meu palpite</Link>
          ) : (
            "Se você palpitou sem conta, abra o seu link pessoal e toque em “Guardar na minha conta”."
          )}
        </EmptyState>
      )}
    </div>
  );
}
