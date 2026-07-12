import Link from "next/link";
import type { Metadata } from "next";
import { PlayerRole, RosterStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TeamLogo } from "@/components/TeamLogo";
import { RoleIcon } from "@/components/RoleIcon";
import { roleLabel } from "@/lib/labels";
import { PlayersFilters } from "@/components/PlayersFilters";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Jugadores",
  description: "Busca jugadores y filtra por rol, equipo y división.",
};

type SearchParams = {
  q?: string;
  role?: string;
  split?: string;
  team?: string;
  division?: string;
  page?: string;
};

function parseRole(value?: string): PlayerRole | undefined {
  if (value && (Object.values(PlayerRole) as string[]).includes(value)) {
    return value as PlayerRole;
  }
  return undefined;
}

/// Estados que NO son "jugar": staff y capitán (no confirmado como jugador).
const NON_PLAYING: RosterStatus[] = [
  RosterStatus.CAPTAIN,
  RosterStatus.COACH,
  RosterStatus.MANAGER,
  RosterStatus.ANALYST,
  RosterStatus.STAFF,
];

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const role = parseRole(params.role);
  const splitSlug = params.split ?? "";
  const teamSlug = params.team ?? "";
  const divisionName = params.division ?? "";
  const PAGE_SIZE = 48;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  // Una fila = UNA PERSONA. Una misma persona puede tener varias participaciones
  // (un equipo por split), así que filtramos sobre el jugador y luego elegimos
  // qué participación enseñar.
  const where: Prisma.PlayerWhereInput = {
    ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
    // Debe haber jugado en algún equipo (y cumplir equipo/división si se filtran).
    rosterMemberships: {
      some: {
        rosterStatus: { notIn: NON_PLAYING },
        ...(teamSlug || divisionName || splitSlug
          ? {
              teamEntry: {
                ...(teamSlug ? { team: { slug: teamSlug } } : {}),
                ...(divisionName || splitSlug
                  ? {
                      division: {
                        ...(divisionName ? { name: divisionName } : {}),
                        ...(splitSlug
                          ? { edition: { split: { slug: splitSlug } } }
                          : {}),
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
    },
    // El rol puede estar en la participación (derivado de sus partidas de ese
    // equipo) o, si allí no hay evidencia, en el rol principal del jugador.
    ...(role
      ? {
          OR: [
            { primaryRole: role },
            { rosterMemberships: { some: { role } } },
          ],
        }
      : {}),
  };

  const [total, players, teams, divisions, splits] = await Promise.all([
    prisma.player.count({ where }),
    prisma.player.findMany({
      where,
      include: {
        rosterMemberships: {
          where: { rosterStatus: { notIn: NON_PLAYING } },
          include: {
            teamEntry: {
              include: {
                team: true,
                division: {
                  include: { edition: { include: { split: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: [{ displayName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true, shortName: true },
    }),
    prisma.division.findMany({
      orderBy: { level: "asc" },
      select: { name: true },
      distinct: ["name"],
    }),
    prisma.split.findMany({
      orderBy: { sequenceNumber: "desc" },
      select: { slug: true, name: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  function pageHref(p: number): string {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (params.role) sp.set("role", params.role);
    if (splitSlug) sp.set("split", splitSlug);
    if (teamSlug) sp.set("team", teamSlug);
    if (divisionName) sp.set("division", divisionName);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/players?${qs}` : "/players";
  }

  const teamOptions = teams.map((t) => ({
    value: t.slug,
    label: t.shortName ? `${t.name} (${t.shortName})` : t.name,
  }));
  const divisionOptions = divisions.map((d) => ({ value: d.name, label: d.name }));
  const splitOptions = splits.map((s) => ({ value: s.slug, label: s.name }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Jugadores</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {total} {total === 1 ? "jugador" : "jugadores"}
          {totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}
        </p>
      </header>

      <div className="card p-4">
        <PlayersFilters
          teams={teamOptions}
          divisions={divisionOptions}
          splits={splitOptions}
        />
      </div>

      {players.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Prueba a cambiar el nick o quitar algún filtro."
        />
      ) : (
        <ul className="card divide-y divide-[var(--color-border)] overflow-hidden">
          {players.map((p) => {
            // Participaciones de la más reciente a la más antigua.
            const memberships = [...p.rosterMemberships].sort(
              (a, b) =>
                b.teamEntry.division.edition.split.sequenceNumber -
                a.teamEntry.division.edition.split.sequenceNumber,
            );

            // Enseñamos la que coincide con el filtro; si no, la más reciente.
            const shown =
              memberships.find(
                (m) =>
                  (!teamSlug || m.teamEntry.team.slug === teamSlug) &&
                  (!divisionName ||
                    m.teamEntry.division.name === divisionName) &&
                  (!splitSlug ||
                    m.teamEntry.division.edition.split.slug === splitSlug),
              ) ?? memberships[0];
            if (!shown) return null;

            const effectiveRole =
              shown.role !== "UNKNOWN" ? shown.role : p.primaryRole;

            // En qué periodos ha jugado (P2, P3…), sin repetir.
            const periods = [
              ...new Set(
                memberships.map(
                  (m) => m.teamEntry.division.edition.split.sequenceNumber,
                ),
              ),
            ].sort((a, b) => a - b);

            return (
              <li key={p.id}>
                <Link
                  href={`/players/${p.slug}`}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--color-surface-2)]"
                  title={`${p.displayName} · ${shown.teamEntry.team.name} · ${shown.teamEntry.division.name}`}
                >
                  <TeamLogo
                    name={shown.teamEntry.team.name}
                    shortName={shown.teamEntry.team.shortName}
                    logoUrl={shown.teamEntry.team.logoUrl}
                    size={26}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium transition-colors group-hover:text-[var(--color-accent)]">
                    {p.displayName}
                  </span>

                  {/* Periodos en los que ha jugado */}
                  <span className="hidden shrink-0 items-center gap-1 sm:flex">
                    {periods.map((n) => (
                      <span
                        key={n}
                        className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]"
                        title={`Jugó el Periodo ${n}`}
                      >
                        P{n}
                      </span>
                    ))}
                  </span>

                  {effectiveRole !== "UNKNOWN" && (
                    <span className="hidden shrink-0 items-center gap-1.5 text-xs text-[var(--color-muted)] sm:flex">
                      <span className="text-[var(--color-accent)]">
                        <RoleIcon role={effectiveRole} size={16} />
                      </span>
                      <span className="w-16">{roleLabel(effectiveRole)}</span>
                    </span>
                  )}
                  <span className="w-20 shrink-0 text-right text-xs text-[var(--color-muted)]">
                    {shown.teamEntry.division.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-2 text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 hover:border-[var(--color-accent)] transition-colors"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted)] opacity-40">
              ← Anterior
            </span>
          )}
          <span className="px-2 text-[var(--color-muted)]">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 hover:border-[var(--color-accent)] transition-colors"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted)] opacity-40">
              Siguiente →
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

// Evita el prerender estático: la lista depende de la base de datos y los filtros.
export const dynamic = "force-dynamic";
