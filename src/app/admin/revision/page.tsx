import Link from "next/link";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { mergePlayers } from "@/lib/player-merge";
import { ConfirmButton } from "@/components/ConfirmButton";
import { roleLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Revisión de jugadores · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

// Las acciones van como server actions: hacen POST contra esta misma URL /admin/*,
// así el middleware de admin las protege igual que a la página.

async function reassign(formData: FormData) {
  "use server";
  const source = String(formData.get("source"));
  const target = String(formData.get("target"));
  await mergePlayers([source], target);
  revalidatePath("/admin/revision");
}

async function mergeGroup(formData: FormData) {
  "use server";
  const ids = String(formData.get("ids")).split(",").filter(Boolean);
  if (ids.length < 2) return;
  // Canónico: el que más partidas tenga; el resto se fusionan en él.
  const withCounts = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { id: true, _count: { select: { gameStats: true } } },
  });
  withCounts.sort((a, b) => b._count.gameStats - a._count.gameStats);
  const target = withCounts[0].id;
  await mergePlayers(withCounts.slice(1).map((p) => p.id), target);
  await prisma.player.update({ where: { id: target }, data: { needsReview: false } });
  revalidatePath("/admin/revision");
}

async function confirmDistinct(formData: FormData) {
  "use server";
  await prisma.player.update({ where: { id: String(formData.get("id")) }, data: { needsReview: false } });
  revalidatePath("/admin/revision");
}

async function deletePlayer(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.playerGameStat.deleteMany({ where: { playerId: id } });
  await prisma.player.delete({ where: { id } });
  revalidatePath("/admin/revision");
}

type StatCtx = {
  champion: string;
  position: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  teamId: string;
  teamName: string;
  division: string;
  round: string;
  splitName: string;
  splitSeq: number;
  rival: string;
};

async function getData() {
  const players = await prisma.player.findMany({
    where: { needsReview: true, gameStats: { some: {} } },
    select: {
      id: true,
      displayName: true,
      slug: true,
      primaryRole: true,
      gameStats: {
        select: {
          champion: true,
          position: true,
          kills: true,
          deaths: true,
          assists: true,
          win: true,
          teamId: true,
          team: { select: { name: true } },
          game: {
            select: {
              match: {
                select: {
                  division: { select: { name: true } },
                  round: true,
                  teamAId: true,
                  teamA: { select: { name: true } },
                  teamB: { select: { name: true } },
                  split: { select: { name: true, sequenceNumber: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  });

  // Candidatos de reasignación: la plantilla de los equipos con los que jugó,
  // en el mismo split. Es lo que hace el 90% de los casos (un nick de marcador
  // que en realidad es alguien de la plantilla de ese equipo).
  const teamSplitKeys = new Set<string>();
  for (const p of players)
    for (const s of p.gameStats)
      teamSplitKeys.add(`${s.teamId}|${s.game.match.split.sequenceNumber}`);

  const rosters = await prisma.rosterMembership.findMany({
    where: {
      teamEntry: { division: { edition: { split: { sequenceNumber: { in: [2, 3] } } } } },
    },
    select: {
      teamEntry: {
        select: {
          teamId: true,
          division: { select: { edition: { select: { split: { select: { sequenceNumber: true } } } } } },
        },
      },
      player: { select: { id: true, displayName: true, slug: true, needsReview: true } },
    },
  });
  const candidatesByKey = new Map<string, { id: string; name: string }[]>();
  for (const r of rosters) {
    if (r.player.needsReview) continue; // el destino debe ser un jugador confirmado
    const key = `${r.teamEntry.teamId}|${r.teamEntry.division.edition.split.sequenceNumber}`;
    const arr = candidatesByKey.get(key) ?? [];
    if (!arr.some((x) => x.id === r.player.id)) arr.push({ id: r.player.id, name: r.player.displayName });
    candidatesByKey.set(key, arr);
  }

  // Agrupar por nombre para detectar duplicados de la misma persona.
  const norm = (s: string) => s.trim().toLowerCase();
  const groups = new Map<string, typeof players>();
  for (const p of players) {
    const k = norm(p.displayName);
    const arr = groups.get(k) ?? [];
    arr.push(p);
    groups.set(k, arr);
  }
  // Duplicados primero.
  const ordered = [...groups.values()].sort((a, b) => b.length - a.length || a[0].displayName.localeCompare(b[0].displayName));

  return { ordered, candidatesByKey, total: players.length };
}

export default async function RevisionPage() {
  const { ordered, candidatesByKey, total } = await getData();
  const dupGroups = ordered.filter((g) => g.length > 1).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Revisión de jugadores</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {total} ficha{total === 1 ? "" : "s"} autocreada{total === 1 ? "" : "s"} desde marcadores ·{" "}
          {dupGroups} nombre{dupGroups === 1 ? "" : "s"} con duplicados aparentes.
          <Link href="/admin/reportes" className="ml-2 text-[var(--color-accent)] hover:underline">
            Reportes →
          </Link>
        </p>
        <p className="mt-2 max-w-3xl text-xs text-[var(--color-muted)]">
          Cada ficha se creó porque el nombre del marcador no cuadró con ninguna plantilla. Con el
          equipo, el rival y el campeón delante, decide:{" "}
          <span className="text-[var(--color-text)]">fusionar</span> si son la misma persona,{" "}
          <span className="text-[var(--color-text)]">reasignar</span> si es alguien de la plantilla, o{" "}
          <span className="text-[var(--color-text)]">confirmar</span> si es una persona real distinta.
          Un mismo nick puede ser gente diferente, así que no fusiones a ciegas.
        </p>
      </header>

      <ul className="space-y-4">
        {ordered.map((group) => {
          const isDup = group.length > 1;
          return (
            <li
              key={group[0].id}
              className={`card p-4 ${isDup ? "ring-2 ring-inset ring-amber-500/40" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">
                  {group[0].displayName}
                  {isDup && (
                    <span className="ml-2 text-xs font-normal text-amber-700">
                      {group.length} fichas con este nombre
                    </span>
                  )}
                </h2>
                {isDup && (
                  <form action={mergeGroup}>
                    <input type="hidden" name="ids" value={group.map((p) => p.id).join(",")} />
                    <ConfirmButton
                      confirm={`¿Fusionar las ${group.length} fichas de "${group[0].displayName}" en una? Solo si son la MISMA persona.`}
                      className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
                    >
                      Fusionar las {group.length} en una
                    </ConfirmButton>
                  </form>
                )}
              </div>

              <div className="mt-3 space-y-3">
                {group.map((p) => {
                  // Candidatos de reasignación de todos sus equipos/splits.
                  const cand = new Map<string, string>();
                  for (const s of p.gameStats) {
                    const key = `${s.teamId}|${s.game.match.split.sequenceNumber}`;
                    for (const c of candidatesByKey.get(key) ?? []) cand.set(c.id, c.name);
                  }
                  return (
                    <div key={p.id} className="rounded-lg bg-[var(--color-surface-2)] p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                        <Link href={`/players/${p.slug}`} className="font-mono text-[var(--color-accent)] hover:underline">
                          {p.slug}
                        </Link>
                        <span>rol: {roleLabel(p.primaryRole)}</span>
                        <span>· {p.gameStats.length} partida{p.gameStats.length === 1 ? "" : "s"}</span>
                      </div>

                      <ul className="mt-2 space-y-0.5 text-xs">
                        {p.gameStats.map((s, i) => {
                          const m = s.game.match;
                          const rival = s.teamId === m.teamAId ? m.teamB.name : m.teamA.name;
                          return (
                            <li key={i}>
                              <span className="text-[var(--color-text)]">{s.team.name}</span>
                              <span className="text-[var(--color-muted)]">
                                {" "}vs {rival} · {m.division.name} · {m.split.name} ·{" "}
                              </span>
                              {s.champion ? (
                                <span className="text-[var(--color-text)]">{s.champion}</span>
                              ) : (
                                <span className="text-[var(--color-muted)]">campeón ?</span>
                              )}
                              <span className="text-[var(--color-muted)]">
                                {" "}{s.kills}/{s.deaths}/{s.assists} {s.win ? "✓" : "✗"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>

                      {/* Reasignar a alguien de la plantilla de su equipo */}
                      {cand.size > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                            Reasignar a:
                          </span>
                          {[...cand.entries()].map(([id, name]) => (
                            <form key={id} action={reassign} className="inline">
                              <input type="hidden" name="source" value={p.id} />
                              <input type="hidden" name="target" value={id} />
                              <ConfirmButton
                                confirm={`¿"${p.displayName}" es en realidad ${name}? Se moverán sus partidas a esa ficha.`}
                                className="rounded-md bg-[var(--color-surface)] px-2 py-1 text-xs ring-1 ring-inset ring-[var(--color-border)] hover:ring-[var(--color-accent)] transition-colors"
                              >
                                {name}
                              </ConfirmButton>
                            </form>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2">
                        <form action={confirmDistinct}>
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:border-emerald-500/50 transition-colors"
                          >
                            Confirmar (persona real)
                          </button>
                        </form>
                        <form action={deletePlayer}>
                          <input type="hidden" name="id" value={p.id} />
                          <ConfirmButton
                            confirm={`¿Borrar "${p.displayName}" y sus ${p.gameStats.length} partida(s)? No se puede deshacer.`}
                            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-rose-700 hover:border-rose-500/50 transition-colors"
                          >
                            Borrar
                          </ConfirmButton>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {total === 0 && (
        <p className="text-sm text-[var(--color-muted)]">No hay fichas pendientes con partidas. 🎉</p>
      )}
    </div>
  );
}
