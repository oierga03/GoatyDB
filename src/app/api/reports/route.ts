import { NextResponse } from "next/server";
import { ReportKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const VALID_KINDS = new Set<string>(Object.values(ReportKind));

/// Alta de un reporte de la comunidad (corrección de datos).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (message.length < 5) {
    return NextResponse.json(
      { error: "Cuéntanos algo más (mínimo 5 caracteres)." },
      { status: 400 },
    );
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Mensaje demasiado largo." }, { status: 400 });
  }

  const kind =
    typeof data.kind === "string" && VALID_KINDS.has(data.kind)
      ? (data.kind as ReportKind)
      : ReportKind.OTHER;

  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

  // Validamos que las referencias existan (si se pasan) para no romper el FK.
  const playerId = str(data.playerId, 40);
  const matchId = str(data.matchId, 40);
  const [playerOk, matchOk] = await Promise.all([
    playerId ? prisma.player.findUnique({ where: { id: playerId }, select: { id: true } }) : null,
    matchId ? prisma.match.findUnique({ where: { id: matchId }, select: { id: true } }) : null,
  ]);

  const report = await prisma.report.create({
    data: {
      kind,
      message,
      subject: str(data.subject, 200),
      contact: str(data.contact, 200),
      playerId: playerOk ? playerId : null,
      matchId: matchOk ? matchId : null,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: report.id }, { status: 201 });
}
