import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-5xl" aria-hidden>
        🐐
      </p>
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-sm text-[var(--color-muted)]">
        No hemos encontrado lo que buscabas.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
