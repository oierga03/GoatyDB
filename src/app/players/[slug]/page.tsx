import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { roleLabel, rosterStatusLabel, AWARD_SCOPE_LABELS } from "@/lib/labels";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RoleTag } from "@/components/RoleTag";
import { ResultBadge } from "@/components/ResultBadge";
import { TeamLogo } from "@/components/TeamLogo";
import { ReportDialog } from "@/components/ReportDialog";

async function getPlayer(slug: string) {
  return prisma.player.findUnique({
    where: { slug },
    include: {
      aliases: true,
      rosterMemberships: {
        include: {
          teamEntry: {
            include: {
              team: true,
              division: { include: { edition: { include: { split: true } } } },
            },
          },
        },
      },
      awards: {
        include: {
          awardEdition: {
            include: { awardDefinition: true, split: true, division: true },
          },
          teamEntry: { include: { team: true } },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const player = await prisma.player.findUnique({ where: { slug } });
  return { title: player ? player.displayName : "Jugador" };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = await getPlayer(slug);
  if (!player) notFound();

  // Handle de plataforma (Circuito Tormenta), guardado como alias.
  const ctHandle = player.aliases[0]?.alias ?? null;

  // Ordenamos el historial por split más reciente primero.
  const history = [...player.rosterMemberships].sort((a, b) => {
    const sa = a.teamEntry.division.edition.split.sequenceNumber;
    const sb = b.teamEntry.division.edition.split.sequenceNumber;
    return sb - sa;
  });

  return (
    <div className="space-y-8">
      <Link
        href="/players"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        ← Jugadores
      </Link>

      {/* Cabecera */}
      <header className="flex items-center gap-4">
        <PlayerAvatar name={player.displayName} size={72} />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">{player.displayName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]">
            {player.primaryRole !== "UNKNOWN" && (
              <>
                <span>Rol principal:</span>
                <RoleTag role={player.primaryRole} />
                <span aria-hidden>·</span>
              </>
            )}
            {ctHandle && (
              <span title="Nombre en el Circuito Tormenta">CT: {ctHandle}</span>
            )}
            {player.riotId && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums" title="Cuenta de Riot">
                  {player.riotId}
                </span>
              </>
            )}
            {player.opggUrl && (
              <>
                <span aria-hidden>·</span>
                <a
                  href={player.opggUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] hover:underline"
                >
                  OP.GG ↗
                </a>
              </>
            )}
          </div>
          <div className="mt-2">
            <ReportDialog
              playerId={player.id}
              subject={player.displayName}
              defaultKind="PLAYER_IDENTITY"
              label="¿Algún dato incorrecto? Repórtalo"
            />
          </div>
        </div>
      </header>

      {player.needsReview && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-sm text-amber-200/90">
          <span aria-hidden>ⓘ</span> Este perfil se generó automáticamente a partir de un
          marcador y su identidad está <strong>pendiente de confirmar</strong> (puede ser un
          cambio de nombre o un suplente). Si sabes de quién se trata,{" "}
          <span className="font-medium">usa el botón de reportar</span> de arriba.
        </div>
      )}

      {/* Historial competitivo */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historial competitivo</h2>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Sin participaciones registradas todavía.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((m) => {
              const split = m.teamEntry.division.edition.split;
              return (
                <li key={m.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      {split.name}
                    </span>
                    <ResultBadge result={m.teamEntry.finalResult} />
                  </div>
                  <div className="mt-3 grid gap-y-2 gap-x-6 text-sm sm:grid-cols-2">
                    <Field label="Equipo">
                      <Link
                        href={`/teams/${m.teamEntry.team.slug}`}
                        className="inline-flex items-center gap-1.5 font-medium hover:text-[var(--color-accent)]"
                      >
                        <TeamLogo
                          name={m.teamEntry.team.name}
                          shortName={m.teamEntry.team.shortName}
                          logoUrl={m.teamEntry.team.logoUrl}
                          size={18}
                        />
                        {m.teamEntry.team.name}
                        {m.teamEntry.team.shortName
                          ? ` (${m.teamEntry.team.shortName})`
                          : ""}
                      </Link>
                    </Field>
                    <Field label="División">{m.teamEntry.division.name}</Field>
                    <Field label="Rol">{roleLabel(m.role)}</Field>
                    <Field label="Estado">
                      {rosterStatusLabel(m.rosterStatus)}
                      {m.isCaptain ? " · Capitán" : ""}
                    </Field>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Premios */}
      {player.awards.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Premios</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {player.awards.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden>🏆</span>
                  <span className="font-semibold">
                    {r.awardEdition.awardDefinition.name}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {r.awardEdition.title}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 ring-1 ring-inset ring-[var(--color-border)]">
                    {AWARD_SCOPE_LABELS[r.awardEdition.awardDefinition.scopeType]}
                  </span>
                  {r.awardEdition.split && <span>{r.awardEdition.split.name}</span>}
                  {r.awardEdition.division && (
                    <span>· {r.awardEdition.division.name}</span>
                  )}
                </div>
                {r.citation && (
                  <p className="mt-2 text-sm italic text-[var(--color-muted)]">
                    “{r.citation}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-20 shrink-0 text-[var(--color-muted)]">{label}</span>
      <span>{children}</span>
    </div>
  );
}
