import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { TeamAvatar } from "@/components/TeamAvatar";
import { TEAM, SOCIALS } from "@/lib/team";

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

        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-muted)]">
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

      {/* Somos Goaty Esports — comunidad + redes */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: "rgba(87,195,255,0.5)" }}
        />
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          {/* Texto + redes */}
          <div>
            <div className="accent-rule mb-4 w-16" />
            <h2 className="text-2xl font-bold sm:text-3xl">
              Somos <span className="text-gradient">Goaty Esports</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm text-[var(--color-muted)] sm:text-base">
              Equipo amateur de League of Legends. Creamos contenido con{" "}
              <span className="text-[var(--color-text)]">Goatcast</span> y, sobre
              todo, hacemos comunidad. Síguenos para apoyar el proyecto y entra
              al Discord para enterarte de todo y jugar{" "}
              <span className="text-[var(--color-text)]">inhouses</span> con
              nosotros. 🐐
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-hover flex items-center gap-3 p-3"
                >
                  <svg
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                    className="shrink-0 text-[var(--color-sky)]"
                  >
                    <path d={s.path} />
                  </svg>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {s.label}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {s.sub}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Equipo */}
          <div className="flex justify-center gap-5 sm:gap-8">
            {TEAM.map((m) => (
              <div key={m.name} className="text-center">
                <div className="mx-auto w-fit">
                  <TeamAvatar
                    src={m.src}
                    initial={m.initial}
                    tint={m.tint}
                    size={84}
                  />
                </div>
                <div className="mt-2 text-sm font-semibold">{m.name}</div>
                <div className="text-[0.7rem] uppercase tracking-wide text-[var(--color-muted)]">
                  Cofundador
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
