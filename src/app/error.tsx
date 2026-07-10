"use client";

import { useEffect } from "react";

/**
 * Límite de error de la app. Captura fallos de renderizado o de la base de
 * datos (p. ej. si la conexión con PostgreSQL no está disponible) y muestra
 * un mensaje amable con opción de reintentar.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-5xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="text-2xl font-bold">Algo ha fallado</h1>
      <p className="max-w-md text-sm text-[var(--color-muted)]">
        No hemos podido cargar esta sección. Puede ser un problema temporal con
        la base de datos. Inténtalo de nuevo en unos segundos.
      </p>
      <button type="button" onClick={reset} className="btn-primary">
        Reintentar
      </button>
    </div>
  );
}
