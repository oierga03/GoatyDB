import Link from "next/link";
import type { Metadata } from "next";
import { AwardScopeType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AWARD_CATEGORY_LABELS } from "@/lib/labels";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Hall of Fame",
  description: "Premios de split y de jornada de Hextech.",
};

type SearchParams = { split?: string };

type EditionFull = Prisma.AwardEditionGetPayload<{
  include: {
    awardDefinition: true;
    recipients: {
      include: { player: true; teamEntry: { include: { team: true } } };
    };
  };
}>;

const CATEGORY_ICON: Record<string, string> = {
  MVP: "⭐",
  EXECUTOR: "⚔️",
  ASSISTANT: "🤝",
  ALL_PRO: "🏅",
  PERFORMANCE: "📈",
  CUSTOM: "🎖️",
};

export default async function HallOfFamePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const splits = await prisma.split.findMany({
    orderBy: { sequenceNumber: "desc" },
    select: { name: true, slug: true },
  });
  if (splits.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">🏆 Hall of Fame</h1>
        <EmptyState title="Aún no hay splits cargados" icon="🏆" />
      </div>
    );
  }
  const selectedSlug =
    params.split && splits.some((s) => s.slug === params.split)
      ? params.split
      : splits[0].slug;

  const editions = await prisma.awardEdition.findMany({
    where: { split: { slug: selectedSlug } },
    include: {
      awardDefinition: true,
      recipients: {
        include: { player: true, teamEntry: { include: { team: true } } },
      },
    },
    orderBy: [
      { awardDefinition: { displayPriority: "desc" } },
      { matchday: "asc" },
      { title: "asc" },
    ],
  });

  const splitAwards = editions.filter(
    (e) => e.awardDefinition.scopeType === AwardScopeType.SPLIT,
  );
  const matchdayAwards = editions.filter(
    (e) => e.awardDefinition.scopeType === AwardScopeType.MATCHDAY,
  );

  // Agrupamos las jornadas por número.
  const jornadas = new Map<number, EditionFull[]>();
  for (const e of matchdayAwards) {
    const key = e.matchday ?? 0;
    if (!jornadas.has(key)) jornadas.set(key, []);
    jornadas.get(key)!.push(e);
  }
  const orderedJornadas = [...jornadas.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">🏆 Hall of Fame</h1>
        <div className="flex flex-wrap gap-2">
          {splits.map((s) => {
            const active = s.slug === selectedSlug;
            return (
              <Link
                key={s.slug}
                href={`/hall-of-fame?split=${s.slug}`}
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

      {editions.length === 0 ? (
        <EmptyState
          title="Aún no hay premios en este split"
          description="Se irán añadiendo los MVP, Ejecutor y Asistente de cada jornada y del split."
          icon="🏆"
        />
      ) : (
        <>
          {/* Premios del Split (destacados) */}
          {splitAwards.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Premios del Split</h2>
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {splitAwards.map((e) => (
                  <AwardCard key={e.id} edition={e} featured />
                ))}
              </div>
            </section>
          )}

          {/* Premios de Jornada */}
          {orderedJornadas.length > 0 && (
            <section className="space-y-5">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Premios de Jornada</h2>
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
              {orderedJornadas.map(([md, list]) => (
                <div key={md} className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                    {md > 0 ? `Jornada ${md}` : "Otros"}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((e) => (
                      <AwardCard key={e.id} edition={e} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
function AwardCard({
  edition,
  featured = false,
}: {
  edition: EditionFull;
  featured?: boolean;
}) {
  const cat = edition.awardDefinition.category;
  const r = edition.recipients[0];
  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        featured ? "border-amber-400/30" : "border-[var(--color-border)]"
      }`}
    >
      {edition.imageUrl ? (
        <img
          src={edition.imageUrl}
          alt={edition.title}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-[var(--color-surface)] p-5 text-center">
          <span className="text-4xl" aria-hidden>
            {CATEGORY_ICON[cat] ?? "🏆"}
          </span>
          <span className="font-semibold">{edition.awardDefinition.name}</span>
          <span className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
            {AWARD_CATEGORY_LABELS[cat]}
          </span>
        </div>
      )}

      {r ? (
        <Link
          href={`/players/${r.player.slug}`}
          className="group flex items-center gap-2 bg-[var(--color-surface)] px-3 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <PlayerAvatar name={r.player.displayName} size={28} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium group-hover:text-[var(--color-accent)] transition-colors">
              {r.player.displayName}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              {AWARD_CATEGORY_LABELS[cat]}
            </p>
          </div>
          {r.teamEntry?.team && (
            <TeamLogo
              name={r.teamEntry.team.name}
              shortName={r.teamEntry.team.shortName}
              logoUrl={r.teamEntry.team.logoUrl}
              size={22}
            />
          )}
        </Link>
      ) : (
        <div className="bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-muted)]">
          Sin ganador
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
