/**
 * Value object for geographic coordinates.
 * Latitude: -90..90, Longitude: -180..180.
 *
 * Copy from places/domain to keep eventos module self-contained
 * (shared/domain/ refactor is Non-Goal).
 */
export interface Coordenadas {
  lat: number;
  lng: number;
}

const LAT_RANGE: Readonly<[number, number]> = [-90, 90];
const LNG_RANGE: Readonly<[number, number]> = [-180, 180];

export function isValidCoordenadas(value: unknown): value is Coordenadas {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.lat !== "number" || typeof obj.lng !== "number") return false;
  if (!Number.isFinite(obj.lat) || !Number.isFinite(obj.lng)) return false;
  return (
    obj.lat >= LAT_RANGE[0] &&
    obj.lat <= LAT_RANGE[1] &&
    obj.lng >= LNG_RANGE[0] &&
    obj.lng <= LNG_RANGE[1]
  );
}
