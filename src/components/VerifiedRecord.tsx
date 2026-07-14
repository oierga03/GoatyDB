import Link from "next/link";
import { TeamLogo } from "@/components/TeamLogo";
import type { PlayerRecord } from "@/lib/player-record";

/// El historial REAL de un jugador del tablón, cotejado contra la fuente
/// oficial. Va deliberadamente separado y con otro fondo del resto del anuncio:
/// arriba está lo que el jugador dice de sí mismo, aquí lo que sabemos.
export function VerifiedRecord({ record }: { record: PlayerRecord }) {
  return (
    <Link
      href={`/players/${record.slug}`}
      className="mt-3 block rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 ring-1 ring-inset ring-[var(--color-border)] transition-colors hover:ring-[var(--color-accent)]"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-sky)]">
        <span aria-hidden>✓</span> En GoatyDB
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {record.team && (
          <span className="flex items-center gap-1.5">
            <TeamLogo
              name={record.team.name}
              shortName={record.team.shortName}
              logoUrl={record.team.logoUrl}
              size={18}
            />
            <span className="font-medium">{record.team.name}</span>
          </span>
        )}
        {record.division && (
          <span className="text-[var(--color-muted)]">
            {record.division}
            {record.split && ` · ${record.split}`}
          </span>
        )}

        {record.stats ? (
          <>
            <span className="text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-text)]">
                {record.stats.games}
              </span>{" "}
              partida{record.stats.games === 1 ? "" : "s"}
            </span>
            <span className="text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-text)]">
                {record.stats.winrate}%
              </span>{" "}
              victorias
            </span>
            <span className="text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-text)]">
                {record.stats.kda.toFixed(2)}
              </span>{" "}
              KDA
            </span>
          </>
        ) : (
          // Está en la base de datos pero no hemos podido cotejar ninguna
          // partida suya. Lo decimos, no lo escondemos.
          <span className="text-[var(--color-muted)]">
            Sin partidas registradas todavía
          </span>
        )}

        <span className="ml-auto font-medium text-[var(--color-accent)]">
          Ver ficha →
        </span>
      </div>
    </Link>
  );
}
