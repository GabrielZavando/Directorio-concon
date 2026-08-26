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

function isOptionalUrl(value: unknown): boolean {
  return (
    value === undefined || (typeof value === "string" && isValidUrl(value))
  );
}

function isValidGaleria(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((g) => typeof g === "string" && isValidUrl(g))
  );
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

  if (!isOptionalUrl(img.logo)) return false;
  if (!isOptionalUrl(img.portada)) return false;
  if (!isValidGaleria(img.galeria)) return false;

  const max = planId === "premium" ? MAX_GALERIA_PREMIUM : MAX_GALERIA_FREE;
  return img.galeria.length <= max;
}

export const GALERIA_LIMITS = {
  gratuito: MAX_GALERIA_FREE,
  premium: MAX_GALERIA_PREMIUM,
} as const;
