"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyAds } from "@/lib/my-ads";

/// Si este anuncio se publicó desde ESTE navegador, mostramos un acceso directo
/// a gestionarlo (renovar / marcar / borrar). Si no, no renderiza nada y en la
/// tarjeta solo queda el botón de reportar.
///
/// El enlace lleva el `manageToken`, que es la credencial: por eso solo aparece
/// para quien tiene ese token guardado, no para cualquiera que mire el tablón.
export function OwnerControls({ adId }: { adId: string }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const mine = getMyAds().find((a) => a.id === adId);
    setToken(mine?.token ?? null);
  }, [adId]);

  if (!token) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="badge bg-[var(--color-sky)]/15 text-[var(--color-sky)] ring-1 ring-inset ring-[var(--color-sky)]/30">
        Tu anuncio
      </span>
      <Link
        href={`/tablon/gestionar/${token}`}
        className="text-xs font-medium text-[var(--color-accent)] hover:underline"
      >
        Gestionar o borrar →
      </Link>
    </div>
  );
}
