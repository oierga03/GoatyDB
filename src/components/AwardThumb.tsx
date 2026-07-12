/* eslint-disable @next/next/no-img-element */

/// Miniatura del gráfico de un premio (las tarjetas del GOATCAST).
/// Pequeña a propósito: es un toque visual, no el protagonista.
export function AwardThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-inset ring-amber-500/25 sm:h-20 sm:w-20"
      loading="lazy"
    />
  );
}
