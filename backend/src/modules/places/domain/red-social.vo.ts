/**
 * Value object for social media links attached to a place.
 * Maximum 3 per place (enforced at service layer).
 *
 * `plataforma` is a closed enum (`PlataformaSocialEnum`) — see
 * `plataforma-social.enum.ts` for the canonical list and migration notes
 * (legacy `'twitter'` was renamed to `'x-twitter'` in the platform's
 * 2023 rebrand). Free strings outside the enum are rejected by
 * `isValidRedSocial`.
 */
import {
  PLATAFORMA_SOCIAL_VALUES,
  type PlataformaSocialEnum,
} from "./plataforma-social.enum";

export interface RedSocial {
  /** Platform name — MUST be one of PlataformaSocialEnum values */
  plataforma: PlataformaSocialEnum;
  /** Full URL to the profile */
  url: string;
}

export function isValidRedSocial(value: unknown): value is RedSocial {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  if (typeof r.plataforma !== "string" || r.plataforma.length === 0)
    return false;
  /**
   * Closed-enum membership check (roles-rename change): the plataforma
   * string must be one of the canonical PlataformaSocialEnum values.
   * Replaces the previous "any non-empty string" check — makes the VO
   * consistent with the api-spec.yml enum and the frontend iconography map.
   */
  if (!(PLATAFORMA_SOCIAL_VALUES as readonly string[]).includes(r.plataforma)) {
    return false;
  }
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
