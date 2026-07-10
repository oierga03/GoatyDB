/// Convierte un texto en un slug URL-safe.
/// "División 3 · Ñandú" -> "division-3-nandu"
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
