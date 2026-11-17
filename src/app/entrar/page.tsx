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
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <PageTitle title="Acesso do administrador" subtitle="Receba um link de acesso no seu e-mail. Não precisa de senha." />
      {erro && (
        <p className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">
          Não foi possível entrar. Tente de novo.
        </p>
      )}
      <LoginForm next={safeNext} />
      <p className="text-center text-xs text-muted">
        Esta página é só para o organizador. Para palpitar e acompanhar o bolão, não precisa entrar.
      </p>
    </div>
  );
}
