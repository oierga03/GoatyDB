import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/labels";
import { ageLabel, daysLeft, eloLabel } from "@/lib/free-agents";

export const metadata: Metadata = { title: "Tablón · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

// Las acciones van como server actions (no como ruta /api/) a propósito: los
// server actions hacen POST contra esta misma URL, así que el middleware de
// /admin/* las protege igual que a la página. Una ruta bajo /api/ estaría
// abierta a cualquiera.

async function hideAd(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.freeAgent.update({ where: { id }, data: { status: "HIDDEN" } });
  revalidatePath("/admin/tablon");
  revalidatePath("/tablon");
}

async function restoreAd(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.freeAgent.update({ where: { id }, data: { status: "PUBLISHED" } });
  revalidatePath("/admin/tablon");
  revalidatePath("/tablon");
}

async function deleteAd(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.freeAgent.delete({ where: { id } });
  revalidatePath("/admin/tablon");
  revalidatePath("/tablon");
}

export default async function AdminTablonPage() {
  const ads = await prisma.freeAgent.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      player: { select: { slug: true, displayName: true } },
      reports: {
        where: { status: "OPEN" },
        select: { id: true, message: true, contact: true, createdAt: true },
      },
    },
    take: 200,
  });

  // Lo reportado va primero: es lo único que requiere que hagas algo.
  const sorted = [...ads].sort((a, b) => b.reports.length - a.reports.length);
  const reported = ads.filter((a) => a.reports.length > 0).length;
  const live = ads.filter(
    (a) => a.status === "PUBLISHED" && daysLeft(a.expiresAt) > 0,
  ).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Tablón de busco equipo</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {live} anuncio{live === 1 ? "" : "s"} activo{live === 1 ? "" : "s"} ·{" "}
          {ads.length} en total ·{" "}
          <span className={reported > 0 ? "font-semibold text-rose-700" : ""}>
            {reported} reportado{reported === 1 ? "" : "s"}
          </span>
        </p>
        <Link
          href="/admin/reportes"
          className="mt-2 inline-block text-sm text-[var(--color-accent)] hover:underline"
        >
          Ver todos los reportes →
        </Link>
      </header>

      {ads.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Todavía no se ha apuntado nadie.
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((ad) => {
            const left = daysLeft(ad.expiresAt);
            const expired = left === 0;
            return (
              <li
                key={ad.id}
                className={`card p-4 ${
                  ad.reports.length > 0 ? "ring-2 ring-inset ring-rose-500/40" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`badge ${
                      ad.status === "HIDDEN"
                        ? "bg-rose-600/15 text-rose-800 ring-1 ring-inset ring-rose-500/30"
                        : ad.status === "FILLED"
                          ? "bg-slate-600/10 text-slate-600 ring-1 ring-inset ring-slate-500/20"
                          : expired
                            ? "bg-amber-600/15 text-amber-800 ring-1 ring-inset ring-amber-600/30"
                            : "bg-emerald-600/15 text-emerald-800 ring-1 ring-inset ring-emerald-600/30"
                    }`}
                  >
                    {ad.status === "HIDDEN"
                      ? "Oculto"
                      : ad.status === "FILLED"
                        ? "Ya tiene equipo"
                        : expired
                          ? "Caducado"
                          : `Activo · ${left}d`}
                  </span>
                  {ad.reports.length > 0 && (
                    <span className="badge bg-rose-600/15 text-rose-800 ring-1 ring-inset ring-rose-500/30">
                      ⚑ {ad.reports.length} reporte
                      {ad.reports.length === 1 ? "" : "s"}
                    </span>
                  )}
                  <span className="text-[var(--color-muted)]">
                    {new Date(ad.createdAt).toLocaleDateString("es-ES")}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-base font-semibold">{ad.lolNick}</span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {roleLabel(ad.role)}
                    {ad.secondaryRole && ` · ${roleLabel(ad.secondaryRole)}`} ·{" "}
                    {eloLabel(ad.currentElo)} · {ageLabel(ad.ageBracket)} años
                  </span>
                  {ad.player && (
                    <Link
                      href={`/players/${ad.player.slug}`}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      ficha →
                    </Link>
                  )}
                </div>

                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Discord: <span className="font-mono">{ad.discord}</span>
                  {ad.opggUrl && (
                    <>
                      {" · "}
                      <a
                        href={ad.opggUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-[var(--color-accent)] hover:underline"
                      >
                        OP.GG ↗
                      </a>
                    </>
                  )}
                </p>
                <p className="mt-1 text-sm">{ad.availability}</p>
                {ad.about && (
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{ad.about}</p>
                )}

                {ad.reports.length > 0 && (
                  <ul className="mt-3 space-y-2 rounded-lg bg-rose-600/5 p-3 ring-1 ring-inset ring-rose-500/20">
                    {ad.reports.map((r) => (
                      <li key={r.id} className="text-xs">
                        <p className="whitespace-pre-wrap">{r.message}</p>
                        {r.contact && (
                          <p className="mt-0.5 text-[var(--color-muted)]">
                            Contacto: {r.contact}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {ad.status === "HIDDEN" ? (
                    <form action={restoreAd}>
                      <input type="hidden" name="id" value={ad.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-emerald-500/50 transition-colors"
                      >
                        Restaurar
                      </button>
                    </form>
                  ) : (
                    <form action={hideAd}>
                      <input type="hidden" name="id" value={ad.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-amber-500/50 transition-colors"
                      >
                        Ocultar
                      </button>
                    </form>
                  )}
                  <form action={deleteAd}>
                    <input type="hidden" name="id" value={ad.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-rose-700 hover:border-rose-500/50 transition-colors"
                    >
                      Borrar
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
