import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/BackLink";
import { ROLE_ORDER, WIN_BADGE_CLASS, LOSS_BADGE_CLASS } from "@/lib/labels";
import { TeamLogo } from "@/components/TeamLogo";
import { RoleIcon } from "@/components/RoleIcon";
import { ReportDialog } from "@/components/ReportDialog";

async function getMatch(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      teamA: true,
      teamB: true,
      division: { include: { edition: { include: { split: true } } } },
      games: {
        orderBy: { gameNumber: "asc" },
        include: { stats: { include: { player: true } } },
      },
    },
  });
}

type MatchFull = NonNullable<Prisma.PromiseReturnType<typeof getMatch>>;
type GameStat = MatchFull["games"][number]["stats"][number];

function roundLabel(m: { round: string; matchday: number | null }): string {
  if (m.matchday != null) return `Suizo · Jornada ${m.matchday}`;
  return m.round;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const m = await getMatch(id);
  if (!m) return { title: "Partida" };
  return { title: `${m.teamA.name} vs ${m.teamB.name}` };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const aWon = match.winnerSide === "A";
  const bWon = match.winnerSide === "B";
  const hasStats = match.games.some((g) => g.stats.length > 0);

  return (
    <div className="space-y-8">
      <BackLink fallbackHref={`/teams/${match.teamA.slug}`} />

      {/* Cabecera */}
      <header className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          {match.division.name} · {roundLabel(match)} ·{" "}
          {match.division.edition.split.name}
        </p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <TeamRef team={match.teamA} winner={aWon} align="start" />
          <div className="text-3xl font-extrabold tabular-nums">
            <span className={aWon ? "text-[var(--color-accent)]" : ""}>
              {match.scoreA}
            </span>
            <span className="mx-2 text-[var(--color-muted)]">-</span>
            <span className={bWon ? "text-[var(--color-accent)]" : ""}>
              {match.scoreB}
            </span>
          </div>
          <TeamRef team={match.teamB} winner={bWon} align="end" />
        </div>
        <div className="mt-3 flex justify-end">
          <ReportDialog
            matchId={match.id}
            subject={`${match.teamA.name} vs ${match.teamB.name}`}
            defaultKind="MATCH_DATA"
            label="¿Algún dato incorrecto? Repórtalo"
          />
        </div>
      </header>

      {/* Partidas */}
      {!hasStats ? (
        <p className="text-sm text-[var(--color-muted)]">
          Aún no hay detalle de las partidas de este enfrentamiento.
        </p>
      ) : (
        <div className="space-y-6">
          {match.games.map((g) => (
            <section key={g.id} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                Partida {g.gameNumber}
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <GameSide
                  team={match.teamA}
                  stats={g.stats.filter((s) => s.side === "A")}
                  win={g.winnerSide === "A"}
                />
                <GameSide
                  team={match.teamB}
                  stats={g.stats.filter((s) => s.side === "B")}
                  win={g.winnerSide === "B"}
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamRef({
  team,
  winner,
  align,
}: {
  team: MatchFull["teamA"];
  winner: boolean;
  align: "start" | "end";
}) {
  return (
    <Link
      href={`/teams/${team.slug}`}
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        align === "end" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <TeamLogo name={team.name} shortName={team.shortName} logoUrl={team.logoUrl} size={40} />
      <span
        className={`truncate font-semibold hover:text-[var(--color-accent)] ${
          winner ? "" : "text-[var(--color-muted)]"
        }`}
      >
        {team.name}
      </span>
    </Link>
  );
}

function GameSide({
  team,
  stats,
  win,
}: {
  team: MatchFull["teamA"];
  stats: GameStat[];
  win: boolean;
}) {
  const sorted = [...stats].sort(
    (a, b) => ROLE_ORDER.indexOf(a.position) - ROLE_ORDER.indexOf(b.position),
  );
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
        <TeamLogo name={team.name} shortName={team.shortName} logoUrl={team.logoUrl} size={22} />
        <span className="flex-1 truncate text-sm font-semibold">{team.name}</span>
        <span
          className={`badge ${
            win
              ? WIN_BADGE_CLASS
              : LOSS_BADGE_CLASS
          }`}
        >
          {win ? "Victoria" : "Derrota"}
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {sorted.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-2 text-sm">
            <RoleIcon role={s.position} size={16} className="shrink-0 text-[var(--color-muted)]" />
            {s.champion && (
              <span className="w-20 shrink-0 truncate text-xs text-[var(--color-muted)]">
                {s.champion}
              </span>
            )}
            <Link
              href={`/players/${s.player.slug}`}
              className="min-w-0 flex-1 truncate font-medium hover:text-[var(--color-accent)]"
            >
              {s.player.displayName}
            </Link>
            <span className="shrink-0 tabular-nums text-[var(--color-muted)]">
              {s.kills}/{s.deaths}/{s.assists}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const dynamic = "force-dynamic";
