"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin/resultados", label: "Resultados" },
  { href: "/admin/palpites", label: "Palpites" },
  { href: "/admin/participantes", label: "Participantes" },
  { href: "/admin/jogos", label: "Jogos" },
  { href: "/admin/times", label: "Times" },
  { href: "/admin/edicoes", label: "Edições" },
];

export function AdminTabs() {
  const pathname = usePathname();
  const edicao = useSearchParams().get("edicao");
  return (
    <nav className="no-print flex overflow-x-auto rounded-xl border border-border bg-card p-1 lg:max-w-3xl">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={edicao && tab.href !== "/admin/edicoes" ? `${tab.href}?edicao=${edicao}` : tab.href}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-center text-sm font-semibold",
              active ? "bg-primary text-primary-fg" : "text-muted hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
