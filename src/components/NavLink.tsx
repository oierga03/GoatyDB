"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`relative px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? "text-[var(--color-text)]"
          : "text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
      }`}
    >
      {label}
      {active && (
        <span className="absolute inset-x-2 -bottom-[1px] h-0.5 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-3)]" />
      )}
    </Link>
  );
}
