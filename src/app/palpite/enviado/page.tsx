import { PartyPopper, Plus } from "lucide-react";
import Link from "next/link";
import { entriesOpen, getCurrentBundle } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Palpite enviado", robots: { index: false } };

/** Confirmação depois de enviar um palpite pelo site. */
export default async function PalpiteEnviadoPage({ searchParams }: { searchParams: Promise<{ nome?: string }> }) {
  const name = ((await searchParams).nome ?? "").slice(0, 40);
  const bundle = await getCurrentBundle();
  const open = bundle ? entriesOpen(bundle.edition) : false;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="card space-y-3 border-primary/40 bg-primary-soft p-6 text-center">
        <PartyPopper className="mx-auto size-10 text-primary" />
        <h1 className="text-2xl font-extrabold tracking-tight">Palpite enviado!</h1>
        {name && (
          <p className="text-lg">
            <span className="text-muted">Nome do palpite:</span> <strong>{name}</strong>
          </p>
        )}
        <p className="text-sm">
          O organizador vai conferir e colocar o palpite no seu nome. Se precisar mudar alguma coisa, fale com ele.
        </p>
      </section>
      <div className="grid gap-2 sm:grid-cols-2">
        {open && (
          <Link href="/palpite" className="btn-primary min-h-12">
            <Plus className="size-4" /> Fazer mais um palpite
          </Link>
        )}
        <Link href="/" className="btn-outline min-h-12">
          Ver quem já palpitou
        </Link>
      </div>
    </div>
  );
}
