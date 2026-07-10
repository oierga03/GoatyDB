import { Logo } from "./Logo";

/// Pantalla de carga de marca: el logo Goaty "respirando" con un glow azul
/// clarito, más una barrita con brillo. Se usa como fallback de carga global.
export function BrandLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 text-center">
      <div className="goaty-pulse">
        <Logo size={96} />
      </div>
      <p className="text-sm font-semibold tracking-wide text-[var(--color-sky)]">
        {label}
      </p>
      <div className="skeleton h-1.5 w-44 rounded-full" />
    </div>
  );
}
