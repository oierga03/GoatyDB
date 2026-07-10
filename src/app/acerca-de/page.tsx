import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "Quiénes están detrás de GoatyDB y Goaty Esports, qué hacemos y cómo unirte a la comunidad.",
};

const TEAM = [
  { name: "Oier", role: "CEO · Cofundador", initial: "O", tint: "#57c3ff" },
  { name: "Adrián", role: "CEO · Cofundador", initial: "A", tint: "#8b5cf6" },
  { name: "Jorge", role: "CEO · Cofundador", initial: "J", tint: "#f5b301" },
];

const SOCIALS = [
  {
    label: "X / Twitter",
    sub: "Síguenos y apóyanos",
    href: "https://x.com/GoatyEsports",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "Twitch",
    sub: "Míranos en directo",
    href: "https://www.twitch.tv/goaty_esports",
    path: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z",
  },
  {
    label: "Discord",
    sub: "Noticias + inhouses",
    href: "https://discord.gg/JSusPDRux",
    path: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z",
  },
];

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
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-extrabold"
                style={{
                  color: m.tint,
                  background: `color-mix(in oklab, ${m.tint} 16%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${m.tint} 45%, transparent)`,
                }}
              >
                {m.initial}
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
