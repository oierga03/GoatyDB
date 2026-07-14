import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { AgeBracket, EloTier, PlayerRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { expiryFromNow, normalizeOpggUrl, SELECTABLE_ROLES } from "@/lib/free-agents";
import { slugify } from "@/lib/slug";

/// Los anuncios se publican al instante (sin cola de moderación), así que las
/// defensas contra el spam tienen que ir aquí. Ninguna es infalible por sí
/// sola; juntas hacen que soltar basura salga caro.
const MAX_ADS_PER_IP_PER_DAY = 3;

const VALID_ROLES = new Set<string>(SELECTABLE_ROLES);
const VALID_ELOS = new Set<string>(Object.values(EloTier));
const VALID_AGES = new Set<string>(Object.values(AgeBracket));

/// La IP solo se guarda hasheada: nos sirve para contar, no para identificar.
function hashIp(req: Request): string | null {
  const raw =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip");
  if (!raw) return null;
  return createHash("sha256").update(raw).digest("hex");
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/// Alta de un anuncio en el tablón de "busco equipo".
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("JSON inválido.");
  }
  const data = body as Record<string, unknown>;

  // El honeypot: un campo invisible que un humano nunca rellena y un bot sí.
  // Fingimos éxito para no enseñarle al bot cómo pasar el filtro.
  if (typeof data.website === "string" && data.website.trim()) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const text = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "";

  const lolNick = text(data.lolNick, 40);
  if (lolNick.length < 2) return bad("Pon tu nick de LoL.");

  const discord = text(data.discord, 60);
  if (discord.length < 2) return bad("Pon tu Discord: sin él nadie puede contactarte.");

  const availability = text(data.availability, 140);
  if (availability.length < 3) return bad("Di cuándo puedes jugar.");

  const about = text(data.about, 280) || null;

  if (!VALID_ROLES.has(text(data.role, 20))) return bad("Elige tu rol principal.");
  const role = data.role as PlayerRole;

  const secondaryRaw = text(data.secondaryRole, 20);
  const secondaryRole =
    secondaryRaw && VALID_ROLES.has(secondaryRaw) ? (secondaryRaw as PlayerRole) : null;

  if (!VALID_AGES.has(text(data.ageBracket, 20))) return bad("Elige tu tramo de edad.");
  const ageBracket = data.ageBracket as AgeBracket;

  const currentRaw = text(data.currentElo, 20);
  const currentElo = VALID_ELOS.has(currentRaw) ? (currentRaw as EloTier) : null;
  const peakRaw = text(data.peakElo, 20);
  const peakElo = VALID_ELOS.has(peakRaw) ? (peakRaw as EloTier) : null;

  const opggRaw = text(data.opggUrl, 300);
  let opggUrl: string | null = null;
  if (opggRaw) {
    opggUrl = normalizeOpggUrl(opggRaw);
    if (!opggUrl) return bad("El enlace de OP.GG no es válido (debe ser de op.gg).");
  }

  const now = new Date();
  const ipHash = hashIp(req);

  // Un mismo Discord no puede tener dos anuncios vivos: para cambiar algo está
  // el enlace de gestión.
  const existing = await prisma.freeAgent.findFirst({
    where: {
      discord: { equals: discord, mode: "insensitive" },
      status: "PUBLISHED",
      expiresAt: { gt: now },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "Ya tienes un anuncio activo con ese Discord. Usa el enlace de gestión que te dimos para editarlo o bórralo.",
      },
      { status: 409 },
    );
  }

  if (ipHash) {
    const recent = await prisma.freeAgent.count({
      where: {
        ipHash,
        createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recent >= MAX_ADS_PER_IP_PER_DAY) {
      return NextResponse.json(
        { error: "Has publicado demasiados anuncios hoy. Inténtalo mañana." },
        { status: 429 },
      );
    }
  }

  // Si el nick ya está en la base de datos, enlazamos su ficha: sus partidas
  // reales valen más que cualquier elo autodeclarado.
  const player = await prisma.player.findUnique({
    where: { slug: slugify(lolNick) },
    select: { id: true },
  });

  const ad = await prisma.freeAgent.create({
    data: {
      lolNick,
      discord,
      opggUrl,
      role,
      secondaryRole,
      currentElo,
      peakElo,
      ageBracket,
      availability,
      about,
      ipHash,
      playerId: player?.id ?? null,
      expiresAt: expiryFromNow(now),
    },
    select: { id: true, manageToken: true },
  });

  return NextResponse.json(
    { ok: true, id: ad.id, manageToken: ad.manageToken },
    { status: 201 },
  );
}
