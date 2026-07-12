import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Estadísticas",
  description:
    "Campeones más jugados, líderes por KDA y reparto de partidas del split.",
};

const MIN_GAMES = 4; // mínimo para entrar en los rankings (evita la 1-partida-perfecta)

/**
 * Barra de magnitud: una sola tinta (la pista es un paso más claro del mismo
 * tono), marca fina con extremos redondeados y la cifra SIEMPRE visible al lado
 * — nunca información solo por color.
 */
function Bar({
  label,
  href,
  value,
  max,
  right,
  title,
}: {
  label: string;
  href?: string;
  value: number;
  max: number;
  right: string;
  title: string;
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  const name = href ? (
    <Link href={href} className="truncate hover:text-[var(--color-accent)]">
      {label}
    </Link>
  ) : (
    <span className="truncate">{label}</span>
  );

  return (
    <li
      className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[var(--color-surface-2)]"
      title={title}
    >
      <span className="flex w-32 shrink-0 text-sm font-medium">{name}</span>
      <span
        className="h-2.5 flex-1 overflow-hidden rounded-full"
        style={{
          background: "color-mix(in oklab, var(--color-accent) 14%, transparent)",
        }}
        aria-hidden
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, background: "var(--color-accent)" }}
        />
      </span>
      <span className="w-28 shrink-0 text-right text-xs tabular-nums text-[var(--color-muted)]">
        {right}
      </span>
    </li>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && (
          <span className="text-xs text-[var(--color-muted)]">{hint}</span>
        )}
      </div>
      <ul className="card divide-y divide-[var(--color-border)] overflow-hidden py-1">
        {children}
      </ul>
    </section>
  );
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ split?: string }>;
}) {
  const { split: splitParam } = await searchParams;

  // Solo tienen sentido los splits que ya tienen partidas cargadas.
  const splits = await prisma.split.findMany({
    where: { matches: { some: {} } },
    orderBy: { sequenceNumber: "desc" },
    select: { id: true, name: true, slug: true },
  });

  if (splits.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <EmptyState
          title="Todavía no hay partidas"
          description="En cuanto se carguen las jornadas aparecerán aquí los campeones más jugados y los líderes."
        />
      </div>
    );
  }

  const selected = splits.find((s) => s.slug === splitParam) ?? splits[0];

  const [stats, divisions] = await Promise.all([
    prisma.playerGameStat.findMany({
      where: { game: { match: { splitId: selected.id } } },
      select: {
        playerId: true,
        champion: true,
        win: true,
        kills: true,
        deaths: true,
        assists: true,
      },
    }),
    prisma.division.findMany({
      where: { edition: { splitId: selected.id } },
      orderBy: { level: "asc" },
      select: { name: true, _count: { select: { matches: true } } },
    }),
  ]);

  // --- Campeones ---------------------------------------------------------
  const champMap = new Map<string, { picks: number; wins: number }>();
  for (const s of stats) {
    const name = s.champion.trim();
    if (!name) continue;
    const e = champMap.get(name) ?? { picks: 0, wins: 0 };
    e.picks++;
    if (s.win) e.wins++;
    champMap.set(name, e);
  }
  const champions = [...champMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.picks - a.picks || a.name.localeCompare(b.name))
    .slice(0, 12);
  const champPicks = [...champMap.values()].reduce((n, v) => n + v.picks, 0);

  // --- Líderes por KDA ---------------------------------------------------
  const agg = new Map<
    string,
    { games: number; k: number; d: number; a: number; wins: number }
  >();
  for (const s of stats) {
    const e = agg.get(s.playerId) ?? { games: 0, k: 0, d: 0, a: 0, wins: 0 };
    e.games++;
    e.k += s.kills;
    e.d += s.deaths;
    e.a += s.assists;
    if (s.win) e.wins++;
    agg.set(s.playerId, e);
  }
  const ranked = [...agg.entries()]
    .filter(([, v]) => v.games >= MIN_GAMES)
    .map(([playerId, v]) => ({
      playerId,
      games: v.games,
      kda: (v.k + v.a) / Math.max(v.d, 1),
      kills: v.k,
    }))
    .sort((a, b) => b.kda - a.kda)
    .slice(0, 10);

  const killers = [...agg.entries()]
    .map(([playerId, v]) => ({ playerId, kills: v.k, games: v.games }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 10);

  const ids = [...new Set([...ranked, ...killers].map((r) => r.playerId))];
  const people = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, displayName: true },
  });
  const nameOf = new Map(people.map((p) => [p.id, p]));

  const maxPicks = champions[0]?.picks ?? 1;
  const maxKda = ranked[0]?.kda ?? 1;
  const maxKills = killers[0]?.kills ?? 1;
  const maxDivMatches = Math.max(1, ...divisions.map((d) => d._count.matches));

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Estadísticas</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {selected.name} · {stats.length} registros de partida
          </p>
        </div>
        {splits.length > 1 && (
          <nav className="flex flex-wrap gap-2" aria-label="Elegir split">
            {splits.map((s) => {
              const active = s.id === selected.id;
              return (
                <Link
                  key={s.id}
                  href={`/estadisticas?split=${s.slug}`}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-surface-2)] text-[var(--color-text)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {s.name}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {champions.length > 0 && (
        <Panel
          title="Campeones más jugados"
          hint={`${champMap.size} campeones · ${champPicks} picks conocidos`}
        >
          {champions.map((c) => {
            const wr = Math.round((c.wins / c.picks) * 100);
            return (
              <Bar
                key={c.name}
                label={c.name}
                value={c.picks}
                max={maxPicks}
                right={`${c.picks} · ${wr}% WR`}
                title={`${c.name}: ${c.picks} picks, ${c.wins} victorias (${wr}%)`}
              />
            );
          })}
        </Panel>
      )}

      {ranked.length > 0 && (
        <Panel
          title="Líderes por KDA"
          hint={`Mínimo ${MIN_GAMES} partidas`}
        >
          {ranked.map((r) => {
            const p = nameOf.get(r.playerId);
            return (
              <Bar
                key={r.playerId}
                label={p?.displayName ?? "—"}
                href={p ? `/players/${p.slug}` : undefined}
                value={r.kda}
                max={maxKda}
                right={`${r.kda.toFixed(2)} · ${r.games}j`}
                title={`${p?.displayName}: KDA ${r.kda.toFixed(2)} en ${r.games} partidas`}
              />
            );
          })}
        </Panel>
      )}

      {killers.length > 0 && (
        <Panel title="Más asesinatos" hint="Total del split">
          {killers.map((r) => {
            const p = nameOf.get(r.playerId);
            return (
              <Bar
                key={r.playerId}
                label={p?.displayName ?? "—"}
                href={p ? `/players/${p.slug}` : undefined}
                value={r.kills}
                max={maxKills}
                right={`${r.kills} · ${r.games}j`}
                title={`${p?.displayName}: ${r.kills} asesinatos en ${r.games} partidas`}
              />
            );
          })}
        </Panel>
      )}

      {divisions.length > 0 && (
        <Panel title="Enfrentamientos por división" hint="Series cargadas">
          {divisions.map((d) => (
            <Bar
              key={d.name}
              label={d.name}
              value={d._count.matches}
              max={maxDivMatches}
              right={`${d._count.matches}`}
              title={`${d.name}: ${d._count.matches} enfrentamientos`}
            />
          ))}
        </Panel>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        El campeón solo aparece en las capturas en vista avanzada, así que los
        rankings de campeones usan {champPicks} de {stats.length} registros. El
        KDA y los asesinatos sí usan todos.
      </p>
    </div>
  );
}

export const dynamic = "force-dynamic";
