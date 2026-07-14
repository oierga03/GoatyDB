import { NextResponse } from "next/server";
import { findPlayerIdsByNick, getPlayerRecords } from "@/lib/player-record";

/// Busca a los jugadores que responden a un nick, para autocompletar el
/// formulario del tablón.
///
/// Devuelve una lista, no uno solo: hay nicks que comparten varias personas, y
/// en ese caso elegir por ellas sería adivinar. Que elija el jugador.
///
/// No expone nada que no esté ya publicado en /players.
export async function GET(req: Request) {
  const nick = new URL(req.url).searchParams.get("nick")?.trim() ?? "";
  if (nick.length < 2) return NextResponse.json({ candidates: [] });

  const ids = await findPlayerIdsByNick(nick);
  if (ids.length === 0) return NextResponse.json({ candidates: [] });

  const records = await getPlayerRecords(ids);
  const candidates = ids
    .map((id) => records.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    // Primero los que están en una plantilla oficial. Quien rellena este
    // formulario es una persona inscrita en el circuito; los otros suelen ser
    // duplicados que creamos desde un marcador y aún no hemos confirmado.
    .sort(
      (a, b) =>
        Number(b.registered) - Number(a.registered) ||
        (b.stats?.games ?? 0) - (a.stats?.games ?? 0),
    );

  return NextResponse.json({ candidates });
}
