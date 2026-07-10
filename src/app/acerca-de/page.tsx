import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { TeamAvatar } from "@/components/TeamAvatar";
import { TEAM, SOCIALS } from "@/lib/team";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "Quiénes están detrás de GoatyDB y Goaty Esports, qué hacemos y cómo unirte a la comunidad.",
};

export default async function QuienesSomosPage() {
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
    <div className="mx-auto max-w-4xl space-y-12">
      {/* Cabecera */}
      <header className="flex items-center gap-4">
        <div className="relative flex w-fit items-center justify-center">
          <div
            className="pointer-events-none absolute -inset-3 -z-10 rounded-full blur-xl"
            style={{
              background:
                "radial-gradient(circle, rgba(87,195,255,0.4), transparent 68%)",
            }}
          />
          <Logo size={64} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Quiénes somos</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            El equipo detrás de Goaty<span className="text-gradient">DB</span> y
            Goaty Esports.
          </p>
        </div>
      </header>

      {/* Intro */}
      <section className="space-y-3 text-[var(--color-muted)]">
        <p>
          <span className="text-[var(--color-text)]">Goaty Esports</span> es un
          proyecto amateur de League of Legends: competimos, creamos contenido
          con <span className="text-[var(--color-text)]">Goatcast</span> y, sobre
          todo, hacemos comunidad. <span className="text-[var(--color-text)]">
          GoatyDB</span> nace de ahí: dejar constancia de la escena amateur de
          Hextech — quién jugó, en qué equipo y división, cómo quedó y qué ganó,
          con datos verificados.
        </p>
      </section>

      {/* El equipo */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-sky)]">
          El equipo
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TEAM.map((m) => (
            <div key={m.name} className="card card-hover p-5 text-center">
              <div className="mx-auto w-fit">
                <TeamAvatar
                  src={m.src}
                  initial={m.initial}
                  tint={m.tint}
                  size={72}
                />
              </div>
              <div className="mt-3 text-lg font-semibold">{m.name}</div>
              <div className="mt-0.5 text-xs uppercase tracking-wide text-[var(--color-muted)]">
                {m.role}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comunidad */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="accent-rule mb-4 w-16" />
        <h2 className="text-2xl font-bold">Únete a la comunidad</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
          Si te gusta el proyecto, la mejor forma de ayudar es seguirnos en{" "}
          <span className="text-[var(--color-text)]">Twitter</span> y{" "}
          <span className="text-[var(--color-text)]">Twitch</span>. Y para
          enterarte de todo y jugar <span className="text-[var(--color-text)]">
          inhouses</span> con nosotros, entra en el Discord. ¡Te esperamos! 🐐
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-hover flex items-center gap-3 p-4"
            >
              <svg
                width={26}
                height={26}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
                className="shrink-0 text-[var(--color-sky)]"
              >
                <path d={s.path} />
              </svg>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{s.label}</span>
                <span className="block text-xs text-[var(--color-muted)]">
                  {s.sub}
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card px-4 py-5 text-center">
            <div className="text-2xl font-extrabold text-gradient">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-[var(--color-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* Fuente de datos + tecnología */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            Fuente de datos
          </h2>
          <p className="mt-2 text-lg font-semibold">Circuito Tormenta</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Datos recopilados del Circuito Tormenta (Hextech Series), sin
            inventar lo que no se puede comprobar.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            Construido con
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {["Next.js", "TypeScript", "Tailwind", "Prisma", "PostgreSQL"].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[var(--color-muted)]"
                >
                  {t}
                </span>
              ),
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
