import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fusión de jugadores
//
// Un jugador se crea automáticamente (needsReview) cuando un nombre de marcador
// no se pudo vincular a una plantilla. Al revisarlos aparecen dos casos:
//  - la misma persona partida en varias fichas → fusionar entre sí.
//  - un nick de marcador que es en realidad alguien de la plantilla → reasignar.
// Ambos son la misma operación: mover las partidas de unas fichas a otra y
// borrar las vacías.
// ---------------------------------------------------------------------------

export type MergeResult = { reassigned: number; deleted: number; sources: number };

/// Mueve todo lo de `sourceIds` a `targetId` y borra las fichas de origen.
///
/// Las partidas que colisionan (el destino ya juega en esa partida) se
/// descartan en vez de reasignarse: no puede haber dos veces el mismo jugador
/// en una partida. El nombre de cada origen se guarda como alias del destino,
/// así el mismo nick en un marcador futuro se resolverá solo.
export async function mergePlayers(
  sourceIds: string[],
  targetId: string,
): Promise<MergeResult> {
  const sources = sourceIds.filter((id) => id && id !== targetId);
  if (sources.length === 0) return { reassigned: 0, deleted: 0, sources: 0 };

  const target = await prisma.player.findUnique({
    where: { id: targetId },
    select: { id: true, displayName: true, gameStats: { select: { gameId: true } } },
  });
  if (!target) throw new Error("El jugador destino no existe.");
  const targetGames = new Set(target.gameStats.map((g) => g.gameId));

  let reassigned = 0;
  let deleted = 0;

  for (const sid of sources) {
    const src = await prisma.player.findUnique({
      where: { id: sid },
      select: { id: true, displayName: true, gameStats: { select: { id: true, gameId: true } } },
    });
    if (!src) continue;

    for (const g of src.gameStats) {
      if (targetGames.has(g.gameId)) {
        await prisma.playerGameStat.delete({ where: { id: g.id } });
        deleted++;
      } else {
        await prisma.playerGameStat.update({ where: { id: g.id }, data: { playerId: targetId } });
        targetGames.add(g.gameId);
        reassigned++;
      }
    }

    // Referencias que pudieran colgar de la ficha de origen.
    await prisma.report.updateMany({ where: { playerId: sid }, data: { playerId: targetId } });
    await prisma.freeAgent.updateMany({ where: { playerId: sid }, data: { playerId: targetId } });
    await prisma.playerAlias.deleteMany({ where: { playerId: sid } });
    // Los premios tienen clave única (edición, jugador); si chocaran, se deja el del destino.
    try {
      await prisma.awardRecipient.updateMany({ where: { playerId: sid }, data: { playerId: targetId } });
    } catch {
      await prisma.awardRecipient.deleteMany({ where: { playerId: sid } });
    }
    await prisma.rosterMembership.deleteMany({ where: { playerId: sid } });

    // Guardamos el nick de origen como alias del destino, si aporta algo nuevo.
    const alias = src.displayName.trim();
    if (alias && alias.toLowerCase() !== target.displayName.trim().toLowerCase()) {
      const exists = await prisma.playerAlias.findFirst({
        where: { playerId: targetId, alias: { equals: alias, mode: "insensitive" } },
        select: { id: true },
      });
      if (!exists) await prisma.playerAlias.create({ data: { playerId: targetId, alias } });
    }

    await prisma.player.delete({ where: { id: sid } });
  }

  return { reassigned, deleted, sources: sources.length };
}
