import type { Metadata } from "next";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { SocialLinks } from "@/components/SocialLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GoatyDB",
    template: "%s · GoatyDB",
  },
  description:
    "Base pública de referencia para el amateur de Hextech / League of Legends: jugadores, equipos, divisiones, resultados y premios.",
};

const NAV = [
  { href: "/players", label: "Jugadores" },
  { href: "/teams", label: "Equipos" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/70 backdrop-blur-md">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
                <Logo size={32} />
                <span>
                  Goaty<span className="text-gradient">DB</span>
                </span>
              </Link>
              <nav className="flex items-center gap-1">
                {NAV.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} />
                ))}
              </nav>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--color-accent)]/40 to-transparent" />
          </header>

          <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
            {children}
          </main>

          <footer className="border-t border-[var(--color-border)] mt-8">
            <div className="mx-auto max-w-6xl px-4 py-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-[var(--color-muted)]">
              <span>
                Un proyecto de{" "}
                <span className="font-semibold text-[var(--color-text)]">
                  Goaty Esports
                </span>{" "}
                · Datos: Circuito Tormenta (Hextech)
              </span>
              <div className="flex items-center gap-4">
                <SocialLinks />
                <Link
                  href="/acerca-de"
                  className="hover:text-[var(--color-text)]"
                >
                  Quiénes somos →
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
