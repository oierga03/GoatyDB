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

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const role = parseRole(params.role);
  const teamSlug = params.team ?? "";
  const divisionName = params.division ?? "";
  const PAGE_SIZE = 48;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  // Construimos el filtro sobre las participaciones (roster memberships):
  // cada fila = un jugador en un equipo/división/split concreto.
  const where: Prisma.RosterMembershipWhereInput = {
    // Solo jugadores: excluimos staff y capitán (no confirmado como jugador).
    rosterStatus: {
      notIn: [
        RosterStatus.CAPTAIN,
        RosterStatus.COACH,
        RosterStatus.MANAGER,
        RosterStatus.ANALYST,
        RosterStatus.STAFF,
      ],
    },
    ...(q ? { player: { displayName: { contains: q, mode: "insensitive" } } } : {}),
    // El rol vive en la participación (derivado de las partidas de ESE equipo).
    // Si ahí no hay evidencia, caemos al rol principal del jugador.
    ...(role
      ? {
          OR: [
            { role },
            {
              AND: [
                { role: PlayerRole.UNKNOWN },
                { player: { primaryRole: role } },
              ],
            },
          ],
        }
      : {}),
    ...(teamSlug || divisionName
      ? {
          teamEntry: {
            ...(teamSlug ? { team: { slug: teamSlug } } : {}),
            ...(divisionName ? { division: { name: divisionName } } : {}),
          },
        }
      : {}),
  };

  const [total, memberships, teams, divisions] = await Promise.all([
    prisma.rosterMembership.count({ where }),
    prisma.rosterMembership.findMany({
      where,
      include: {
        player: true,
        teamEntry: { include: { team: true, division: true } },
      },
      orderBy: [{ player: { displayName: "asc" } }],
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
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  function pageHref(p: number): string {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (params.role) sp.set("role", params.role);
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Jugadores</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {total} {total === 1 ? "resultado" : "resultados"}
          {totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}
        </p>
      </header>

      <div className="card p-4">
        <PlayersFilters teams={teamOptions} divisions={divisionOptions} />
      </div>

      {memberships.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Prueba a cambiar el nick o quitar algún filtro."
        />
      ) : (
        /* Listado en filas finas: logo del equipo · nombre · división. */
        <ul className="card divide-y divide-[var(--color-border)] overflow-hidden">
          {memberships.map((m) => {
            // Rol de esa participación; si no hay, el principal del jugador.
            const effectiveRole =
              m.role !== "UNKNOWN" ? m.role : m.player.primaryRole;
            return (
            <li key={m.id}>
              <Link
                href={`/players/${m.player.slug}`}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <TeamLogo
                  name={m.teamEntry.team.name}
                  shortName={m.teamEntry.team.shortName}
                  logoUrl={m.teamEntry.team.logoUrl}
                  size={26}
                />
                <span className="min-w-0 flex-1 truncate font-medium transition-colors group-hover:text-[var(--color-accent)]">
                  {m.player.displayName}
                </span>
                {/* Rol derivado de las capturas: icono + nombre. */}
                {effectiveRole !== "UNKNOWN" && (
                  <span className="hidden shrink-0 items-center gap-1.5 text-xs text-[var(--color-muted)] sm:flex">
                    <span className="text-[var(--color-accent)]">
                      <RoleIcon role={effectiveRole} size={16} />
                    </span>
                    <span className="w-16">{roleLabel(effectiveRole)}</span>
                  </span>
                )}
                <span className="w-20 shrink-0 text-right text-xs text-[var(--color-muted)]">
                  {m.teamEntry.division.name}
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
