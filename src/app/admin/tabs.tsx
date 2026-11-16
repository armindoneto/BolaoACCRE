"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin/resultados", label: "Resultados" },
  { href: "/admin/palpites", label: "Palpites" },
  { href: "/admin/jogos", label: "Jogos" },
  { href: "/admin/edicoes", label: "Edições" },
];

export function AdminTabs() {
  const pathname = usePathname();
  const edicao = useSearchParams().get("edicao");
  return (
    <nav className="no-print grid grid-cols-4 rounded-xl border border-border bg-card p-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={edicao && tab.href !== "/admin/edicoes" ? `${tab.href}?edicao=${edicao}` : tab.href}
            className={cn(
              "rounded-lg py-2.5 text-center text-sm font-semibold",
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
