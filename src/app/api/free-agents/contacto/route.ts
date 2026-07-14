import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/// Devuelve el Discord de un anuncio, y solo cuando alguien lo pide.
///
/// El motivo de que esto sea un endpoint y no una prop del componente: si el
/// Discord viaja en el HTML de /tablon, un solo `curl` se lleva el contacto de
/// todos los jugadores de la escena. Así hay que pedirlos de uno en uno.
///
/// No es infalible — los ids están en la página y alguien decidido puede
/// recorrerlos — pero convierte una cosecha masiva y gratis en un trabajo.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta el anuncio." }, { status: 400 });
  }

  const ad = await prisma.freeAgent.findFirst({
    where: { id, status: "PUBLISHED", expiresAt: { gt: new Date() } },
    select: { discord: true },
  });
  if (!ad) {
    return NextResponse.json({ error: "Este anuncio ya no está activo." }, { status: 404 });
  }

  return NextResponse.json(
    { discord: ad.discord },
    { headers: { "Cache-Control": "no-store" } },
  );
}
