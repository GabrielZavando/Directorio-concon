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
  /** Full street address (required). */
  direccion: string;
  /** Geographic coordinates (required). */
  coordenadas: Coordenadas;
}

/** Runtime guard: ensures an `Ubicacion` has the required fields. */
export function isValidUbicacion(value: unknown): value is Ubicacion {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.direccion !== "string" ||
    candidate.direccion.length === 0
  ) {
    return false;
  }
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
    candidate.nombreLugar !== undefined &&
    typeof candidate.nombreLugar !== "string"
  ) {
    return false;
  }
  return true;
}
