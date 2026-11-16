"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin/resultados", label: "Resultados" },
  { href: "/admin/palpites", label: "Palpites" },
  { href: "/admin/jogos", label: "Jogos" },
  { href: "/admin/times", label: "Times" },
  { href: "/admin/edicoes", label: "Edições" },
];

export function AdminTabs() {
  const pathname = usePathname();
  const edicao = useSearchParams().get("edicao");
  return (
    <nav className="no-print flex overflow-x-auto rounded-xl border border-border bg-card p-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={edicao && tab.href !== "/admin/edicoes" ? `${tab.href}?edicao=${edicao}` : tab.href}
            className={cn(
              "flex-1 rounded-lg px-1.5 py-2.5 text-center text-[13px] font-semibold sm:text-sm",
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
