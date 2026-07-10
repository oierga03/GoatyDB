import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TeamLogo } from "@/components/TeamLogo";
import { ResultBadge } from "@/components/ResultBadge";
import { TeamsFilters } from "@/components/TeamsFilters";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Equipos",
  description: "Equipos, divisiones y resultados por split.",
};

type SearchParams = { split?: string; q?: string; division?: string };

type EntryWithTeam = Prisma.TeamEntryGetPayload<{
  include: { team: true; division: true; group: true };
}>;

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const divisionName = params.division ?? "";

  // El split es el filtro maestro. Por defecto, el más reciente.
  const splits = await prisma.split.findMany({
    orderBy: { sequenceNumber: "desc" },
    select: { name: true, slug: true },
  });

  if (splits.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Equipos</h1>
        <EmptyState title="Todavía no hay ningún split cargado" icon="🛡️" />
      </div>
    );
  }

  const selectedSlug =
    params.split && splits.some((s) => s.slug === params.split)
      ? params.split
      : splits[0].slug;

  // Datos que dependen del split seleccionado: divisiones y participaciones.
  const [divisions, entries] = await Promise.all([
    prisma.division.findMany({
      where: { edition: { split: { slug: selectedSlug } } },
      orderBy: { level: "asc" },
      select: { name: true, level: true },
    }),
    prisma.teamEntry.findMany({
      where: {
        division: {
          edition: { split: { slug: selectedSlug } },
          ...(divisionName ? { name: divisionName } : {}),
        },
        ...(q ? { team: { name: { contains: q, mode: "insensitive" } } } : {}),
      },
      include: { team: true, division: true, group: true },
      orderBy: [
        { finalPosition: { sort: "asc", nulls: "last" } },
        { team: { name: "asc" } },
      ],
    }),
  ]);

  const divisionOptions = divisions.map((d) => ({ value: d.name, label: d.name }));
  const splitOptions = splits.map((s) => ({ value: s.slug, label: s.name }));

  // Agrupamos: división → grupo → participaciones (ya ordenadas por puesto).
  // Cada división puede tener varios grupos de 8 (o ninguno, = un solo grupo).
  const NO_GROUP = "__nogroup__";
  const levelByName = new Map(divisions.map((d) => [d.name, d.level]));
  const byDivision = new Map<string, EntryWithTeam[]>();
  for (const entry of entries) {
    const key = entry.division.name;
    if (!byDivision.has(key)) byDivision.set(key, []);
    byDivision.get(key)!.push(entry);
  }

  const orderedDivisions = [...byDivision.entries()]
    .sort((a, b) => (levelByName.get(a[0]) ?? 999) - (levelByName.get(b[0]) ?? 999))
    .map(([divName, divEntries]) => {
      const groupMap = new Map<
        string,
        { label: string; order: number; entries: EntryWithTeam[] }
      >();
      for (const entry of divEntries) {
        const key = entry.group?.name ?? NO_GROUP;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            label: entry.group?.name ?? "",
            order: entry.group?.displayOrder ?? -1,
            entries: [],
          });
        }
        groupMap.get(key)!.entries.push(entry);
      }
      const groups = [...groupMap.values()].sort(
        (a, b) => a.order - b.order || a.label.localeCompare(b.label),
      );
      return { divName, total: divEntries.length, groups };
    });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Equipos</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {entries.length} {entries.length === 1 ? "equipo" : "equipos"}
          {divisionName ? ` · ${divisionName}` : ""}
        </p>
      </header>

      <div className="card p-4">
        <TeamsFilters
          splits={splitOptions}
          divisions={divisionOptions}
          selectedSplit={selectedSlug}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Prueba a cambiar el split, el nombre o el filtro de división."
          icon="🛡️"
        />
      ) : (
        <div className="space-y-10">
          {orderedDivisions.map((div) => (
            <section key={div.divName} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{div.divName}</h2>
                <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)] ring-1 ring-inset ring-[var(--color-border)]">
                  {div.total}
                </span>
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>

              {div.groups.map((g) => (
                <div key={g.label || "single"} className="space-y-3">
                  {g.label && (
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                      {g.label}
                    </h3>
                  )}
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.entries.map((entry) => (
                      <li key={entry.id}>
                        <TeamCard entry={entry} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamCard({ entry }: { entry: EntryWithTeam }) {
  return (
    <Link
      href={`/teams/${entry.team.slug}`}
      className="card card-hover group flex h-full items-center gap-3 p-4"
    >
      <TeamLogo
        name={entry.team.name}
        shortName={entry.team.shortName}
        logoUrl={entry.team.logoUrl}
        size={40}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold group-hover:text-[var(--color-accent)] transition-colors">
          {entry.team.name}
        </p>
        {entry.team.shortName && (
          <p className="text-xs text-[var(--color-muted)]">{entry.team.shortName}</p>
        )}
      </div>
      {(entry.finalResult !== "UNKNOWN" || entry.groupWins != null) && (
        <div className="flex flex-col items-end gap-1">
          {entry.finalResult !== "UNKNOWN" && (
            <ResultBadge result={entry.finalResult} />
          )}
          {entry.groupWins != null && entry.groupLosses != null && (
            <span className="text-xs tabular-nums text-[var(--color-muted)]">
              {entry.groupWins}-{entry.groupLosses}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export const dynamic = "force-dynamic";
