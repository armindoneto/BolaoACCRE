import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { EmptyState } from "@/components/page-title";
import { getUser, isAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { AdminTabs } from "./tabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    const user = await getUser();
    if (!user) redirect("/entrar?next=/admin");
    return (
      <EmptyState title="Área restrita">
        A conta {user.email} não é de administrador.
        <form action={signOut} className="mt-3">
          <button type="submit" className="btn-outline">Sair</button>
        </form>
      </EmptyState>
    );
  }
  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Administração</p>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="font-semibold text-primary">Ver o site</Link>
          {!isDemoMode() && (
            <form action={signOut}>
              <button type="submit" className="cursor-pointer font-semibold text-muted">Sair</button>
            </form>
          )}
        </div>
      </div>
      <Suspense>
        <AdminTabs />
      </Suspense>
      {children}
    </div>
  );
}
