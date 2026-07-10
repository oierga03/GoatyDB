import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";

const CARDS = [
  {
    href: "/players",
    icon: "🎮",
    title: "Jugadores",
    desc: "Busca por nick y filtra por rol, equipo y división.",
    tint: "rgba(87,195,255,0.5)",
  },
  {
    href: "/teams",
    icon: "🛡️",
    title: "Equipos",
    desc: "Rosters, divisiones y resultados por split.",
    tint: "rgba(139,92,246,0.5)",
  },
  {
    href: "/hall-of-fame",
    icon: "🏆",
    title: "Hall of Fame",
    desc: "Premios de split y de jornada.",
    tint: "rgba(245,179,1,0.5)",
  },
];

export default async function HomePage() {
  const [players, teams, awards, splits] = await Promise.all([
    prisma.player.count(),
    prisma.team.count(),
    prisma.awardEdition.count(),
    prisma.split.count(),
  ]);

  const stats = [
    { label: "Jugadores", value: players },
    { label: "Equipos", value: teams },
    { label: "Premios", value: awards },
    { label: "Splits", value: splits },
  ];

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] px-6 py-16 text-center sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(38rem 22rem at 50% -12%, rgba(87,195,255,0.20), transparent 70%), radial-gradient(26rem 20rem at 12% 120%, rgba(45,212,191,0.14), transparent 70%), radial-gradient(26rem 20rem at 88% 120%, rgba(139,92,246,0.16), transparent 70%)",
          }}
        />

        {/* Logo con halo azul */}
        <div className="relative mx-auto mb-6 flex w-fit items-center justify-center">
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(87,195,255,0.45), transparent 68%)",
            }}
          />
          <Logo size={132} />
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/5 px-3 py-1 text-xs text-[var(--color-muted)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-sky)]" />
          Base de datos de Hextech · Split 2 2026
        </span>

        <h1 className="mt-5 text-5xl font-extrabold tracking-tight sm:text-7xl">
          Goaty<span className="text-gradient">DB</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--color-muted)] sm:text-lg">
          Cada jugador, cada equipo y cada trofeo del amateur de Hextech, en un
          solo sitio. Quién jugó, en qué equipo y división, cómo quedó y qué
          ganó — con datos verificados.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/players" className="btn-primary">
            Explorar jugadores →
          </Link>
          <Link
            href="/teams"
            className="rounded-lg border border-[var(--color-border)] px-4 py-[0.55rem] text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-sky)]/60"
          >
            Ver equipos
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="card card-hover relative overflow-hidden px-4 py-6 text-center"
          >
            <div className="accent-rule absolute inset-x-6 top-0 opacity-60" />
            <div className="text-3xl font-extrabold text-gradient sm:text-4xl">
              {s.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-[var(--color-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* Accesos */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card card-hover group relative overflow-hidden p-5"
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
              style={{ background: card.tint }}
            />
            <div className="text-2xl">{card.icon}</div>
            <h2 className="mt-3 text-xl font-semibold transition-colors group-hover:text-[var(--color-accent)]">
              {card.title}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">{card.desc}</p>
            <span className="mt-4 inline-block -translate-x-1 text-sm font-medium text-[var(--color-accent)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
              Entrar →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
