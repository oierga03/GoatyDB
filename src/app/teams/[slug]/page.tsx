import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PlayerRole, RosterStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  roleLabel,
  rosterStatusLabel,
  ROLE_ORDER,
  ROSTER_STATUS_GROUP,
  isNonPlayer,
} from "@/lib/labels";
import { TeamLogo } from "@/components/TeamLogo";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RoleIcon } from "@/components/RoleIcon";
import { ResultBadge } from "@/components/ResultBadge";

async function getTeam(slug: string) {
  return prisma.team.findUnique({
    where: { slug },
    include: {
      entries: {
        orderBy: { createdAt: "desc" },
        include: {
          group: true,
          division: { include: { edition: { include: { split: true } } } },
          rosterMemberships: { include: { player: true } },
        },
      },
    },
  });
}

async function getMatches(teamId: string) {
  return prisma.match.findMany({
    where: { OR: [{ teamAId: teamId }, { teamBId: teamId }] },
    include: { teamA: true, teamB: true },
    orderBy: [{ matchday: "asc" }, { round: "asc" }],
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  return { title: team ? team.name : "Equipo" };
}

type Membership = {
  id: string;
  role: PlayerRole;
  rosterStatus: RosterStatus;
  isCaptain: boolean;
  player: { slug: string; displayName: string; primaryRole: PlayerRole };
};

/// Rol efectivo del jugador en el roster: el del roster si se conoce, si no el principal (de partidas).
function effectiveRole(m: Membership): PlayerRole {
  return m.role !== "UNKNOWN" ? m.role : m.player.primaryRole;
}

/// Ordena el roster: titulares por posición (Top→Support), luego banquillo, luego staff.
function sortRoster(members: Membership[]): Membership[] {
  return [...members].sort((a, b) => {
    const groupDiff = ROSTER_STATUS_GROUP[a.rosterStatus] - ROSTER_STATUS_GROUP[b.rosterStatus];
    if (groupDiff !== 0) return groupDiff;
    return ROLE_ORDER.indexOf(effectiveRole(a)) - ROLE_ORDER.indexOf(effectiveRole(b));
  });
}

function RosterRow({ m, staff = false }: { m: Membership; staff?: boolean }) {
  const role = effectiveRole(m);
  const isSub =
    m.rosterStatus === "SUBSTITUTE" || m.rosterStatus === "SIXTH";
  // El banquillo va como polivalente; los titulares con su posición.
  const iconRole: PlayerRole = isSub ? "FLEX" : role;
  const showIcon = !staff && (isSub || role !== "UNKNOWN");
  return (
    <li>
      <Link
        href={`/players/${m.player.slug}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors"
      >
        {showIcon ? (
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-accent)] ring-1 ring-inset ring-[var(--color-border)]"
            title={roleLabel(iconRole)}
          >
            <RoleIcon role={iconRole} size={16} />
          </span>
        ) : (
          <span className="w-7 shrink-0" />
        )}
        <PlayerAvatar name={m.player.displayName} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {m.player.displayName}
            {m.isCaptain && (
              <span className="ml-2 text-xs text-[var(--color-accent)]">(C)</span>
            )}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {showIcon
              ? `${roleLabel(iconRole)} · ${rosterStatusLabel(m.rosterStatus)}`
              : rosterStatusLabel(m.rosterStatus)}
          </p>
        </div>
      </Link>
    </li>
  );
}

type MatchRowData = Prisma.MatchGetPayload<{
  include: { teamA: true; teamB: true };
}>;

function MatchRow({ match, teamId }: { match: MatchRowData; teamId: string }) {
  const isTeamA = match.teamAId === teamId;
  const opponent = isTeamA ? match.teamB : match.teamA;
  const myScore = isTeamA ? match.scoreA : match.scoreB;
  const oppScore = isTeamA ? match.scoreB : match.scoreA;
  const won = match.winnerSide === (isTeamA ? "A" : "B");
  const type = match.matchday != null ? `Suizo · J${match.matchday}` : match.round;
  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors"
      >
        <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {type}
        </span>
        <span className="text-xs text-[var(--color-muted)]">vs</span>
        <TeamLogo
          name={opponent.name}
          shortName={opponent.shortName}
          logoUrl={opponent.logoUrl}
          size={22}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {opponent.name}
        </span>
        <span className="shrink-0 tabular-nums text-sm font-semibold">
          {myScore}-{oppScore}
        </span>
        <span
          className={`badge shrink-0 ${
            won
              ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30"
              : "bg-red-400/10 text-red-300 ring-1 ring-inset ring-red-400/20"
          }`}
        >
          {won ? "Victoria" : "Derrota"}
        </span>
      </Link>
    </li>
  );
}

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await getTeam(slug);
  if (!team) notFound();
  const matches = await getMatches(team.id);

  const latest = team.entries[0];
  const roster = latest ? sortRoster(latest.rosterMemberships) : [];
  const players = roster.filter((m) => !isNonPlayer(m.rosterStatus));
  const staff = roster.filter((m) => isNonPlayer(m.rosterStatus));

  return (
    <div className="space-y-8">
      <Link
        href="/teams"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        ← Equipos
      </Link>

      {/* Cabecera */}
      <header className="flex flex-wrap items-center gap-4">
        <TeamLogo
          name={team.name}
          shortName={team.shortName}
          logoUrl={team.logoUrl}
          size={72}
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{team.name}</h1>
          {(latest || team.foundedYear) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
              {latest && <span>{latest.division.name}</span>}
              {latest && <span aria-hidden>·</span>}
              {latest && <span>{latest.division.edition.split.name}</span>}
              {team.foundedYear && (
                <>
                  {latest && <span aria-hidden>·</span>}
                  <span>Fundado en {team.foundedYear}</span>
                </>
              )}
            </div>
          )}
        </div>
        {latest && (
          <div className="flex flex-col items-end gap-1">
            {latest.finalResult !== "UNKNOWN" && (
              <ResultBadge result={latest.finalResult} />
            )}
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
              {latest.finalPosition != null && (
                <span>{latest.finalPosition}º</span>
              )}
              {latest.groupWins != null && latest.groupLosses != null && (
                <span className="tabular-nums">
                  {latest.groupWins}-{latest.groupLosses}
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Roster de la participación más reciente */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Roster{latest ? ` · ${latest.division.edition.split.name}` : ""}
        </h2>
        {roster.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Sin roster registrado.
          </p>
        ) : (
          <div className="space-y-5">
            {players.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  Jugadores
                </h3>
                <ul className="card divide-y divide-[var(--color-border)] overflow-hidden">
                  {players.map((m) => (
                    <RosterRow key={m.id} m={m} />
                  ))}
                </ul>
              </div>
            )}
            {staff.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  Staff
                </h3>
                <ul className="card divide-y divide-[var(--color-border)] overflow-hidden">
                  {staff.map((m) => (
                    <RosterRow key={m.id} m={m} staff />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Partidas */}
      {matches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Partidas</h2>
          <ul className="card divide-y divide-[var(--color-border)] overflow-hidden">
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} teamId={team.id} />
            ))}
          </ul>
        </section>
      )}

      {/* Historial de splits */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historial de splits</h2>
        <ul className="space-y-2">
          {team.entries.map((entry) => (
            <li
              key={entry.id}
              className="card flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {entry.division.edition.split.name}
                </span>
                <span className="text-[var(--color-muted)]">
                  · {entry.division.name}
                  {entry.group ? ` · ${entry.group.name}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {entry.groupWins != null && entry.groupLosses != null && (
                  <span className="tabular-nums text-xs text-[var(--color-muted)]">
                    {entry.groupWins}-{entry.groupLosses}
                  </span>
                )}
                {entry.finalPosition != null && (
                  <span className="text-xs text-[var(--color-muted)]">
                    {entry.finalPosition}º
                  </span>
                )}
                <ResultBadge result={entry.finalResult} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
