/**
 * Post-MVP placeholder — Google business rating data.
 */
export interface ValoracionGoogle {
  rating: number;
  reviewsCount: number;
  mapsLink: string;
}

export function isValidValoracionGoogle(
  value: unknown,
): value is ValoracionGoogle {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.rating !== "number" || !Number.isFinite(v.rating)) return false;
  if (v.rating < 0 || v.rating > 5) return false;
  if (typeof v.reviewsCount !== "number" || v.reviewsCount < 0) return false;
  if (typeof v.mapsLink !== "string" || v.mapsLink.length === 0) return false;
  return true;
}
