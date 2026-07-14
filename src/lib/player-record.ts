import { PlayerRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

/// Busca a las personas que responden a un nick.
///
/// Devuelve una LISTA, no una persona, y eso es deliberado: hay 19 nicks que
/// comparten varias personas ("CG Kille" son seis). Si devolviéramos "la
/// primera que encaje" estaríamos adivinando, que es justo lo que esta web
/// promete no hacer. Cuando hay varias, que elija el jugador.
///
/// Ojo con el slug: NO vale buscar por `slugify(nick)`, porque cuando dos
/// personas comparten nick el slug lleva sufijo ("Traz" → `traz-1178`). Hay que
/// buscar por el nombre.
export async function findPlayerIdsByNick(nick: string): Promise<string[]> {
  const value = nick.trim();
  if (!slugify(value)) return [];

  const players = await prisma.player.findMany({
    where: {
      OR: [
        { displayName: { equals: value, mode: "insensitive" } },
        { slug: slugify(value) },
        // Un rename no debería impedir que te reconozcamos.
        { aliases: { some: { alias: { equals: value, mode: "insensitive" } } } },
      ],
    },
    select: { id: true },
    take: 8,
  });
  return players.map((p) => p.id);
}

/// ¿Este jugador responde de verdad a ese nick? Se usa para validar el
/// `playerId` que llega del formulario: si no lo comprobáramos, cualquiera
/// podría colgar su anuncio de la ficha del mejor jugador del circuito.
export async function playerMatchesNick(playerId: string, nick: string): Promise<boolean> {
  const ids = await findPlayerIdsByNick(nick);
  return ids.includes(playerId);
}

/// Lo que SÍ sabemos de un jugador, cotejado contra la fuente oficial.
///
/// Es el contrapeso del tablón: al lado de un elo que alguien dice tener,
/// esto son sus partidas de verdad. Por eso se muestran juntos.
export type PlayerRecord = {
  id: string;
  slug: string;
  displayName: string;
  role: PlayerRole;
  opggUrl: string | null;
  /// Último equipo en el que se le ha visto (split más reciente).
  team: { name: string; shortName: string | null; logoUrl: string | null } | null;
  division: string | null;
  split: string | null;
  /// null si nunca hemos podido cotejar una partida suya.
  stats: { games: number; winrate: number; kda: number } | null;
  /// ¿Está en la plantilla oficial de algún equipo? Distingue a una PERSONA
  /// registrada en el circuito de un jugador que creamos automáticamente desde
  /// un marcador y que aún no hemos podido confirmar (`needsReview`).
  registered: boolean;
  needsReview: boolean;
};

/// Trae el historial verificado de varios jugadores de una vez.
///
/// En lote a propósito: el tablón puede tener 200 anuncios y hacer una consulta
/// por fila lo pondría de rodillas.
export async function getPlayerRecords(
  playerIds: string[],
): Promise<Map<string, PlayerRecord>> {
  const ids = [...new Set(playerIds.filter(Boolean))];
  const out = new Map<string, PlayerRecord>();
  if (ids.length === 0) return out;

  const [players, gameStats] = await Promise.all([
    prisma.player.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        displayName: true,
        primaryRole: true,
        opggUrl: true,
        needsReview: true,
        rosterMemberships: {
          select: {
            role: true,
            teamEntry: {
              select: {
                team: { select: { name: true, shortName: true, logoUrl: true } },
                division: {
                  select: {
                    name: true,
                    edition: {
                      select: {
                        split: { select: { name: true, sequenceNumber: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.playerGameStat.findMany({
      where: { playerId: { in: ids } },
      select: { playerId: true, kills: true, deaths: true, assists: true, win: true },
    }),
  ]);

  const byPlayer = new Map<
    string,
    { games: number; wins: number; k: number; d: number; a: number }
  >();
  for (const s of gameStats) {
    const e = byPlayer.get(s.playerId) ?? { games: 0, wins: 0, k: 0, d: 0, a: 0 };
    e.games++;
    if (s.win) e.wins++;
    e.k += s.kills;
    e.d += s.deaths;
    e.a += s.assists;
    byPlayer.set(s.playerId, e);
  }

  for (const p of players) {
    // El equipo más reciente: el del split de mayor número de secuencia.
    const latest = [...p.rosterMemberships].sort(
      (x, y) =>
        y.teamEntry.division.edition.split.sequenceNumber -
        x.teamEntry.division.edition.split.sequenceNumber,
    )[0];

    const agg = byPlayer.get(p.id);
    const role =
      p.primaryRole !== PlayerRole.UNKNOWN
        ? p.primaryRole
        : (latest?.role ?? PlayerRole.UNKNOWN);

    out.set(p.id, {
      id: p.id,
      slug: p.slug,
      displayName: p.displayName,
      role,
      opggUrl: p.opggUrl,
      team: latest?.teamEntry.team ?? null,
      division: latest?.teamEntry.division.name ?? null,
      split: latest?.teamEntry.division.edition.split.name ?? null,
      stats: agg
        ? {
            games: agg.games,
            winrate: Math.round((agg.wins / agg.games) * 100),
            // KDA clásico (K+A)/D, con D=1 si nunca murió.
            kda: (agg.k + agg.a) / Math.max(agg.d, 1),
          }
        : null,
      registered: p.rosterMemberships.length > 0,
      needsReview: p.needsReview,
    });
  }

  return out;
}
