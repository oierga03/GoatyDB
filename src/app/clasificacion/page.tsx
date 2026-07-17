import type { Metadata } from "next";
import Link from "next/link";
import type { TeamEntryResult } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TeamLogo } from "@/components/TeamLogo";
import { EmptyState } from "@/components/EmptyState";
import { RESULT_LABELS, RESULT_BADGE_CLASS } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Clasificación",
  description: "Clasificación por división y grupo de cada split del Circuito Tormenta.",
};
export const dynamic = "force-dynamic";

// Resultados de playoffs que merece la pena destacar en la tabla.
const NOTABLE: TeamEntryResult[] = [
  "CHAMPION",
  "RUNNER_UP",
  "SEMIFINALIST",
  "QUARTERFINALIST",
  "PLAYOFFS",
];

type Team = { name: string; slug: string; shortName: string | null; logoUrl: string | null };
type Row = { position: number | null; team: Team; wins: number; losses: number; result: TeamEntryResult };
type GroupBlock = { name: string | null; rows: Row[] };
type DivBlock = { name: string; groups: GroupBlock[]; computed: boolean };

async function getStandings(splitSlug: string): Promise<DivBlock[]> {
  const divisions = await prisma.division.findMany({
    where: { edition: { split: { slug: splitSlug } } },
    orderBy: { level: "asc" },
    select: {
      id: true,
      name: true,
      teamEntries: {
        select: {
          finalPosition: true,
          groupWins: true,
          groupLosses: true,
          finalResult: true,
          group: { select: { name: true } },
          team: { select: { id: true, name: true, slug: true, shortName: true, logoUrl: true } },
        },
      },
    },
  });

  const blocks: DivBlock[] = [];
  for (const div of divisions) {
    // ¿Tenemos la clasificación oficial cargada? (splits terminados)
    const hasStored = div.teamEntries.some((e) => e.finalPosition != null || e.groupWins != null);

    if (hasStored) {
      const byGroup = new Map<string, GroupBlock>();
      for (const e of div.teamEntries) {
        const key = e.group?.name ?? "";
        const gb = byGroup.get(key) ?? { name: e.group?.name ?? null, rows: [] };
        gb.rows.push({
          position: e.finalPosition,
          team: e.team,
          wins: e.groupWins ?? 0,
          losses: e.groupLosses ?? 0,
          result: e.finalResult,
        });
        byGroup.set(key, gb);
      }
      const groups = [...byGroup.values()].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      );
      for (const g of groups) g.rows.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
      blocks.push({ name: div.name, groups, computed: false });
    } else {
      // Split en curso: la calculamos de los resultados de la fase regular.
      const matches = await prisma.match.findMany({
        where: { divisionId: div.id, round: { startsWith: "Jornada" }, winnerSide: { not: null } },
        select: { winnerSide: true, teamAId: true, teamBId: true },
      });
      const rec = new Map<string, { team: Team; group: string | null; w: number; l: number }>();
      for (const e of div.teamEntries)
        rec.set(e.team.id, { team: e.team, group: e.group?.name ?? null, w: 0, l: 0 });
      for (const m of matches) {
        const winner = m.winnerSide === "A" ? m.teamAId : m.teamBId;
        const loser = m.winnerSide === "A" ? m.teamBId : m.teamAId;
        if (rec.has(winner)) rec.get(winner)!.w++;
        if (rec.has(loser)) rec.get(loser)!.l++;
      }
      // Agrupamos por grupo (Grupo A, B…); las divisiones sin grupos van juntas.
      const byGroup = new Map<string, GroupBlock>();
      for (const r of rec.values()) {
        const key = r.group ?? "";
        const gb = byGroup.get(key) ?? { name: r.group, rows: [] };
        gb.rows.push({ position: null, team: r.team, wins: r.w, losses: r.l, result: "UNKNOWN" });
        byGroup.set(key, gb);
      }
      const groups = [...byGroup.values()].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      );
      for (const g of groups) {
        g.rows.sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.team.name.localeCompare(b.team.name));
        g.rows.forEach((r, i) => (r.position = i + 1));
      }
      blocks.push({ name: div.name, groups, computed: true });
    }
  }
  return blocks;
}

export default async function ClasificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ split?: string }>;
}) {
  const params = await searchParams;
  const splits = await prisma.split.findMany({
    orderBy: { sequenceNumber: "desc" },
    select: { name: true, slug: true },
  });
  if (splits.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Clasificación</h1>
        <EmptyState title="Aún no hay splits cargados" icon="📊" />
      </div>
    );
  }
  const selectedSlug =
    params.split && splits.some((s) => s.slug === params.split) ? params.split : splits[0].slug;

  const blocks = await getStandings(selectedSlug);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">Clasificación</h1>
        <div className="flex flex-wrap gap-2">
          {splits.map((s) => {
            const active = s.slug === selectedSlug;
            return (
              <Link
                key={s.slug}
                href={`/clasificacion?split=${s.slug}`}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  active
                    ? "bg-[var(--color-accent)] font-semibold text-black"
                    : "border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {s.name}
              </Link>
            );
          })}
        </div>
      </header>

      {blocks.length === 0 ? (
        <EmptyState title="No hay clasificación para este split todavía" icon="📊" />
      ) : (
        <div className="space-y-10">
          {blocks.map((div) => (
            <section key={div.name} className="space-y-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-semibold">{div.name}</h2>
                {div.computed && (
                  <span className="text-xs text-[var(--color-muted)]">
                    en curso · calculada de los resultados
                  </span>
                )}
              </div>

              {div.groups.map((g, gi) => (
                <div key={gi} className="space-y-2">
                  {g.name && (
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                      {g.name}
                    </h3>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                    <table className="w-full min-w-[26rem] text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
                          <th className="w-10 px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Equipo</th>
                          <th className="w-12 px-2 py-2 text-center">V</th>
                          <th className="w-12 px-2 py-2 text-center">D</th>
                          <th className="px-3 py-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map((r, i) => (
                          <tr
                            key={r.team.slug}
                            className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors"
                          >
                            <td className="px-3 py-2 text-[var(--color-muted)]">
                              {r.position ?? i + 1}
                            </td>
                            <td className="px-3 py-2">
                              <Link
                                href={`/teams/${r.team.slug}`}
                                className="flex items-center gap-2 font-medium hover:text-[var(--color-accent)] transition-colors"
                              >
                                <TeamLogo
                                  name={r.team.name}
                                  shortName={r.team.shortName}
                                  logoUrl={r.team.logoUrl}
                                  size={22}
                                />
                                <span className="truncate">{r.team.name}</span>
                              </Link>
                            </td>
                            <td className="px-2 py-2 text-center font-semibold text-emerald-700">
                              {r.wins}
                            </td>
                            <td className="px-2 py-2 text-center text-[var(--color-muted)]">
                              {r.losses}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {NOTABLE.includes(r.result) && (
                                <span className={`badge ${RESULT_BADGE_CLASS[r.result]}`}>
                                  {RESULT_LABELS[r.result]}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
