import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reportes · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  PLAYER_IDENTITY: "Identidad de jugador",
  PLAYER_ROLE: "Rol",
  MATCH_DATA: "Datos de partida",
  TEAM_DATA: "Datos de equipo",
  OTHER: "Otro",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Abierto",
  RESOLVED: "Resuelto",
  DISMISSED: "Descartado",
};

async function getData() {
  const [reports, review] = await Promise.all([
    prisma.report.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        player: { select: { slug: true, displayName: true } },
        match: {
          select: {
            id: true,
            teamA: { select: { name: true } },
            teamB: { select: { name: true } },
          },
        },
      },
      take: 200,
    }),
    prisma.player.findMany({
      where: { needsReview: true },
      orderBy: { displayName: "asc" },
      select: { slug: true, displayName: true, primaryRole: true },
    }),
  ]);
  return { reports, review };
}

export default async function AdminReportsPage() {
  const { reports, review } = await getData();
  const open = reports.filter((r) => r.status === "OPEN");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Reportes de la comunidad</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {open.length} abierto{open.length === 1 ? "" : "s"} · {reports.length} en total ·{" "}
          {review.length} jugador{review.length === 1 ? "" : "es"} pendiente
          {review.length === 1 ? "" : "s"} de confirmar.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reportes</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Todavía no hay reportes.</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`badge ${
                      r.status === "OPEN"
                        ? "bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/30"
                        : "bg-slate-500/10 text-slate-400 ring-1 ring-inset ring-slate-500/20"
                    }`}
                  >
                    {STATUS_LABELS[r.status]}
                  </span>
                  <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 ring-1 ring-inset ring-[var(--color-border)]">
                    {KIND_LABELS[r.kind]}
                  </span>
                  <span className="text-[var(--color-muted)]">
                    {new Date(r.createdAt).toLocaleDateString("es-ES")}
                  </span>
                  {r.player && (
                    <Link
                      href={`/players/${r.player.slug}`}
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      {r.player.displayName}
                    </Link>
                  )}
                  {r.match && (
                    <Link
                      href={`/matches/${r.match.id}`}
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      {r.match.teamA.name} vs {r.match.teamB.name}
                    </Link>
                  )}
                </div>
                {r.subject && (
                  <p className="mt-2 text-xs text-[var(--color-muted)]">Sobre: {r.subject}</p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-sm">{r.message}</p>
                {r.contact && (
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    Contacto: {r.contact}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Jugadores autocreados pendientes de confirmar
        </h2>
        {review.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Ninguno pendiente.</p>
        ) : (
          <ul className="card divide-y divide-[var(--color-border)] overflow-hidden">
            {review.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/players/${p.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  <span className="font-medium">{p.displayName}</span>
                  <span className="text-xs text-[var(--color-muted)]">{p.primaryRole}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
