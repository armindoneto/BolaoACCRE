import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { BottomNav, TopNav } from "@/components/nav";
import { ThemeProvider, ThemeToggle } from "@/components/theme";
import { isDemoMode } from "@/lib/data";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Bolão ACC-RE", template: "%s · Bolão ACC-RE" },
  description: "Classificação, times e resultados do Bolão ACC-RE.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#16201b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          <header className="no-print sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 lg:px-6">
              <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-fg">
                  ⚽
                </span>
                Bolão ACC-RE
              </Link>
              <div className="ml-auto flex items-center gap-1">
                <TopNav />
                <ThemeToggle />
              </div>
            </div>
          </header>
          {isDemoMode() && (
            <div className="no-print bg-warn-soft px-4 py-1.5 text-center text-xs font-medium text-warn">
              Modo demonstração: dados fictícios, nada fica salvo.
            </div>
          )}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 sm:pb-10 lg:px-6 lg:pt-6">{children}</main>
          <footer className="no-print mx-auto hidden w-full max-w-6xl gap-4 px-4 pb-6 text-xs text-muted sm:flex lg:px-6">
            <Link href="/regras" className="hover:text-fg">Regras</Link>
            <Link href="/meus-palpites" className="hover:text-fg">Meus palpites</Link>
            <Link href="/admin" className="hover:text-fg">Administração</Link>
          </footer>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
