/**
 * Modalidad of an evento: how the event is realized.
 *
 * - `presencial`: occurs at a physical venue (ubicacion required).
 * - `online`: no physical venue (ubicacion forbidden).
 * - `hibrido`: online + own physical coordinates for the map (ubicacion required).
 *
 * No FK to `places`: a link to a place is resolved by coordinate/address
 * coincidence, never by `placeId`.
 */
export const MODALIDAD_VALUES = ["presencial", "online", "hibrido"] as const;

export type Modalidad = (typeof MODALIDAD_VALUES)[number];

export function isModalidad(value: unknown): value is Modalidad {
  return (
    typeof value === "string" &&
    (MODALIDAD_VALUES as ReadonlyArray<string>).includes(value)
  );
}
