/**
 * Value object for social media links attached to a place.
 * Maximum 3 per place (enforced at service layer).
 */
export interface RedSocial {
  /** Platform name, e.g. "instagram", "facebook", "tiktok" */
  plataforma: string;
  /** Full URL to the profile */
  url: string;
}

export function isValidRedSocial(value: unknown): value is RedSocial {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  if (typeof r.plataforma !== "string" || r.plataforma.length === 0)
    return false;
  if (typeof r.url !== "string" || r.url.length === 0) return false;
  try {
    new URL(r.url);
    return true;
  } catch {
    return false;
  }
}

export function isValidRedesSociales(value: unknown): value is RedSocial[] {
  if (!Array.isArray(value)) return false;
  if (value.length > 3) return false;
  return value.every(isValidRedSocial);
}
