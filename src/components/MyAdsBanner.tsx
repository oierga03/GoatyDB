"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyAds, type MyAd } from "@/lib/my-ads";

/// Aviso discreto en el tablón con los anuncios que has publicado desde este
/// navegador, para gestionarlos o borrarlos de un vistazo. Si no aparece nada
/// (otro dispositivo, modo privado), recuerda que el enlace de gestión que se
/// dio al publicar sigue sirviendo.
export function MyAdsBanner() {
  const [ads, setAds] = useState<MyAd[]>([]);

  useEffect(() => {
    setAds(getMyAds());
  }, []);

  if (ads.length === 0) return null;

  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] p-4 ring-1 ring-inset ring-[var(--color-sky)]/40">
      <p className="text-sm font-semibold">
        {ads.length === 1
          ? "Tu anuncio en este dispositivo"
          : `Tus ${ads.length} anuncios en este dispositivo`}
      </p>
      <ul className="mt-2 space-y-1.5">
        {ads.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{a.nick}</span>
            <Link
              href={`/tablon/gestionar/${a.token}`}
              className="shrink-0 text-xs font-medium text-[var(--color-accent)] hover:underline"
            >
              Gestionar o borrar →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
