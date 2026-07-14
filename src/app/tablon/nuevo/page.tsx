import type { Metadata } from "next";
import Link from "next/link";
import { FreeAgentForm } from "@/components/FreeAgentForm";

export const metadata: Metadata = {
  title: "Apúntate al tablón",
  description:
    "Publica tu anuncio de busco equipo en la Hextech: rol, elo, disponibilidad y contacto. Gratis y sin registro.",
};

export default function NuevoAnuncioPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link
          href="/tablon"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          ← Volver al tablón
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Apúntate al tablón</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Un minuto y sin registro. Cuanto mejor lo rellenes, más fácil es que un
          capitán te escriba.
        </p>
      </header>

      <FreeAgentForm />
    </div>
  );
}
