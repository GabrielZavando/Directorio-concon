/**
 * Value object for place images.
 * `galeria` limits enforced at service layer (free ≤ 3, premium ≤ 10).
 */
export interface Imagenes {
  logo?: string;
  portada?: string;
  galeria: string[];
}

const MAX_GALERIA_FREE = 3;
const MAX_GALERIA_PREMIUM = 10;

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates an Imagenes value object.
 * @param planId - 'gratuito' or 'premium', used to enforce galeria limits.
 */
export function isValidImagenes(
  value: unknown,
  planId: "gratuito" | "premium" = "gratuito",
): value is Imagenes {
  if (typeof value !== "object" || value === null) return false;
  const img = value as Record<string, unknown>;

  if (img.logo !== undefined) {
    if (typeof img.logo !== "string" || !isValidUrl(img.logo)) return false;
  }

  if (img.portada !== undefined) {
    if (typeof img.portada !== "string" || !isValidUrl(img.portada))
      return false;
  }

  if (!Array.isArray(img.galeria)) return false;
  if (!img.galeria.every((g) => typeof g === "string" && isValidUrl(g)))
    return false;

  const max = planId === "premium" ? MAX_GALERIA_PREMIUM : MAX_GALERIA_FREE;
  if (img.galeria.length > max) return false;

  return true;
}

export const GALERIA_LIMITS = {
  gratuito: MAX_GALERIA_FREE,
  premium: MAX_GALERIA_PREMIUM,
} as const;
