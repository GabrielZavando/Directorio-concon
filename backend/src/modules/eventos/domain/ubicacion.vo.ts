/**
 * Value Object for an evento's physical venue.
 *
 * Replaces the legacy flat `ubicacionNombre`/`ubicacionDireccion`/`coordenadas`
 * fields and the `placeId` reference. An evento declares its own venue
 * independently of any `places` document.
 */
import type { Coordenadas } from "./coordenadas.vo";

export interface Ubicacion {
  /** Optional venue name (e.g. "Playa Amarilla", "Plaza de Armas"). */
  nombreLugar?: string;
  /** Full street address (optional — only `coordenadas` is mandatory). */
  direccion?: string;
  /** Geographic coordinates (required). */
  coordenadas: Coordenadas;
}

/** Runtime guard: ensures an `Ubicacion` has the required fields. */
export function isValidUbicacion(value: unknown): value is Ubicacion {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  // Only `coordenadas` is mandatory; `direccion`/`nombreLugar` are optional.
  const coordenadas = candidate.coordenadas as
    | Record<string, unknown>
    | undefined;
  if (
    typeof coordenadas !== "object" ||
    coordenadas === null ||
    typeof coordenadas.lat !== "number" ||
    typeof coordenadas.lng !== "number"
  ) {
    return false;
  }
  if (
    candidate.direccion !== undefined &&
    (typeof candidate.direccion !== "string" ||
      candidate.direccion.length === 0)
  ) {
    return false;
  }
  if (
    candidate.nombreLugar !== undefined &&
    typeof candidate.nombreLugar !== "string"
  ) {
    return false;
  }
  return true;
}
