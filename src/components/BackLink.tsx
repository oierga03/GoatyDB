"use client";

import { useRouter } from "next/navigation";

/// Enlace "volver" que lleva a donde venías de verdad (historial del
/// navegador), no a un destino fijo. Si has entrado directo por la URL (sin
/// historial dentro de la web), cae al `fallbackHref`.
///
/// Se renderiza como <a> con el fallback en `href`, así el clic central / abrir
/// en pestaña nueva / sin-JS siguen funcionando; el clic normal usa el historial.
export function BackLink({
  fallbackHref,
  label = "Volver",
}: {
  fallbackHref: string;
  label?: string;
}) {
  const router = useRouter();

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Respeta ctrl/cmd/click-central para abrir en pestaña nueva.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    // Si hay una página anterior dentro de la web, vuelve a ella.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
    >
      ← {label}
    </a>
  );
}
