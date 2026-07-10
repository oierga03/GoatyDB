import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { SocialLinks } from "@/components/SocialLinks";

export const metadata: Metadata = {
  title: "Acerca de",
  description:
    "Qué es GoatyDB, quién lo desarrolla y de dónde salen los datos.",
};

export default async function AcercaDePage() {
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
    <div className="mx-auto max-w-3xl space-y-10">
      {/* Cabecera */}
      <header className="flex items-center gap-4">
        <Logo size={64} />
        <div>
          <h1 className="text-3xl font-bold">
            Acerca de Goaty<span className="text-gradient">DB</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            La base de datos pública del amateur de Hextech.
          </p>
        </div>
      </header>

      <section className="space-y-3 text-[var(--color-muted)]">
        <p>
          <span className="text-[var(--color-text)]">GoatyDB</span> es una
          plataforma pública de referencia para la escena amateur de Hextech /
          League of Legends: jugadores, equipos, divisiones, resultados,
          rosters históricos y premios, split a split.
        </p>
        <p>
          El objetivo es dejar constancia de{" "}
          <span className="text-[var(--color-text)]">
            quién participó, en qué equipo y división, cómo quedó y qué ganó
          </span>{" "}
          — con datos verificados, sin inventar lo que no se puede comprobar.
        </p>
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

      {/* Créditos */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            Desarrollado por
          </h2>
          <p className="mt-2 text-lg font-semibold">Goaty Esports</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Un proyecto del ecosistema Goaty Esports, junto a{" "}
            <span className="text-[var(--color-text)]">Goatcast</span> (creación
            de contenido).
          </p>
          <div className="mt-3">
            <SocialLinks size={20} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            Fuente de datos
          </h2>
          <p className="mt-2 text-lg font-semibold">Circuito Tormenta</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Datos recopilados del Circuito Tormenta (Hextech Series).
          </p>
        </div>
      </section>

      {/* Tecnología */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Construido con
        </h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {["Next.js", "TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL"].map(
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
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
