"use client";

import { CalendarDays, History, ListOrdered, Shield, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Classificação", icon: ListOrdered, match: (p: string) => p === "/" || p.startsWith("/palpite") },
  { href: "/participantes", label: "Participantes", icon: Users, match: (p: string) => p.startsWith("/participante") },
  { href: "/times", label: "Times", icon: Shield, match: (p: string) => p.startsWith("/times") },
  { href: "/campeonato", label: "Campeonato", icon: CalendarDays, match: (p: string) => p.startsWith("/campeonato") },
  { href: "/historico", label: "Histórico", icon: History, match: (p: string) => p.startsWith("/historico") },
];

/** Enquanto o bolão recebe palpites, a primeira aba leva ao convite para palpitar. */
function label(tab: (typeof TABS)[number], entriesOpen: boolean) {
  return tab.href === "/" && entriesOpen ? "Palpitar" : tab.label;
}

/** As 5 abas: barra fixa embaixo no celular, links no topo em telas grandes. */
export function BottomNav({ entriesOpen = false }: { entriesOpen?: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <tab.icon className="size-5" strokeWidth={active ? 2.6 : 2} />
                {label(tab, entriesOpen)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopNav({ entriesOpen = false }: { entriesOpen?: boolean }) {
  const pathname = usePathname();
  return (
    <ul className="hidden items-center gap-1 sm:flex">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium",
                active ? "bg-primary-soft text-primary" : "text-muted hover:text-fg",
              )}
            >
              {label(tab, entriesOpen)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
