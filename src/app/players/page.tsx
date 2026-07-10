import Link from "next/link";
import type { Metadata } from "next";
import { PlayerRole, RosterStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RoleTag } from "@/components/RoleTag";
import { ResultBadge } from "@/components/ResultBadge";
import { TeamLogo } from "@/components/TeamLogo";
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
    ...(role ? { role } : {}),
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m) => (
            <li key={m.id}>
              <Link
                href={`/players/${m.player.slug}`}
                className="card card-hover group flex h-full flex-col gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <PlayerAvatar name={m.player.displayName} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold group-hover:text-[var(--color-accent)] transition-colors">
                      {m.player.displayName}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
                      {m.role !== "UNKNOWN" && <RoleTag role={m.role} />}
                      <TeamLogo
                        name={m.teamEntry.team.name}
                        shortName={m.teamEntry.team.shortName}
                        logoUrl={m.teamEntry.team.logoUrl}
                        size={18}
                      />
                      <span className="truncate">
                        {m.teamEntry.team.shortName ?? m.teamEntry.team.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-sm">
                  <span className="text-[var(--color-muted)]">
                    {m.teamEntry.division.name}
                  </span>
                  <ResultBadge result={m.teamEntry.finalResult} />
                </div>
              </Link>
            </li>
          ))}
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
