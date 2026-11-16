import { EmptyState, PageTitle } from "@/components/page-title";
import { isDemoMode } from "@/lib/data";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next, erro } = await searchParams;
  if (isDemoMode()) {
    return <EmptyState title="Login indisponível">No modo demonstração não existe login.</EmptyState>;
  }
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/meus-palpites";
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <PageTitle title="Entrar" subtitle="Sem senha: use sua conta Google ou receba um link por e-mail." />
      {erro && (
        <p className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">
          Não foi possível entrar. Tente de novo.
        </p>
      )}
      <LoginForm next={safeNext} />
      <p className="text-center text-xs text-muted">
        Ter conta é opcional. Para palpitar e acompanhar, não precisa.
      </p>
    </div>
  );
}
