import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expiryFromNow } from "@/lib/free-agents";

type Action = "renew" | "filled" | "delete";

/// Gestión de un anuncio por su enlace secreto. Sin cuentas ni contraseñas: el
/// token ES la credencial, y solo lo tiene quien publicó el anuncio.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const action = (body as Record<string, unknown>).action as Action;

  const ad = await prisma.freeAgent.findUnique({
    where: { manageToken: token },
    select: { id: true, status: true },
  });
  if (!ad) {
    return NextResponse.json({ error: "Este anuncio ya no existe." }, { status: 404 });
  }

  // Un anuncio retirado por moderación no se puede resucitar desde aquí.
  if (ad.status === "HIDDEN" && action !== "delete") {
    return NextResponse.json(
      { error: "Este anuncio está retirado. Escríbenos si crees que es un error." },
      { status: 403 },
    );
  }

  switch (action) {
    case "renew":
      await prisma.freeAgent.update({
        where: { id: ad.id },
        data: { status: "PUBLISHED", expiresAt: expiryFromNow() },
      });
      return NextResponse.json({ ok: true, status: "PUBLISHED" });

    case "filled":
      await prisma.freeAgent.update({
        where: { id: ad.id },
        data: { status: "FILLED" },
      });
      return NextResponse.json({ ok: true, status: "FILLED" });

    case "delete":
      await prisma.freeAgent.delete({ where: { id: ad.id } });
      return NextResponse.json({ ok: true, status: "DELETED" });

    default:
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  }
}
