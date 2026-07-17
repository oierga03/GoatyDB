import type { Metadata } from "next";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { SocialLinks } from "@/components/SocialLinks";
import { CircuitoTormentaLogo } from "@/components/SourceLogos";
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
  { href: "/clasificacion", label: "Clasificación" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
  { href: "/tablon", label: "Busco equipo" },
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
            <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 text-xs text-[var(--color-muted)]">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span>
                    Un proyecto de{" "}
                    <span className="font-semibold text-[var(--color-text)]">
                      Goaty Esports
                    </span>
                  </span>
                  <span aria-hidden>·</span>
                  <span className="flex items-center gap-2">
                    Datos oficiales de
                    <CircuitoTormentaLogo height={16} className="opacity-75" />
                  </span>
                </div>
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

              {/* Aviso: los logos son de sus dueños y GoatyDB no está afiliado. */}
              <p className="max-w-3xl leading-relaxed opacity-70">
                GoatyDB es un proyecto independiente de aficionados, sin relación
                oficial con GGTech Entertainment ni Riot Games. «Circuito
                Tormenta», «Hextech Series» y sus logotipos son marcas de sus
                respectivos propietarios; se usan únicamente para identificar la
                fuente de los datos.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
