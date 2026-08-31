/**
 * Controlled enum of services a place can offer.
 * Matches the values defined in docs/data-model/data-model.md §places.servicios.
 */
export const SERVICIO_VALUES = [
  "wifi",
  "estacionamiento",
  "acceso-discapacidad",
  "apto-mascotas",
  "delivery",
  "take-away",
  "terraza",
  "vista-al-mar",
  "reservas",
  "ninos-bienvenida",
] as const;

export type ServicioEnum = (typeof SERVICIO_VALUES)[number];
