/**
 * Target audience categories for an event.
 *
 * - `familia`:       family-friendly
 * - `adultos`:       adults only
 * - `tercera_edad`:  seniors
 * - `mascotas`:      pets allowed
 * - `todos`:         all audiences
 * - `ninos`:         children
 * - `adolescentes`:  teenagers
 */
export const PUBLICO_OBJETIVO_VALUES = [
  "familia",
  "adultos",
  "tercera_edad",
  "mascotas",
  "todos",
  "ninos",
  "adolescentes",
] as const;

export type PublicoObjetivoEnum = (typeof PUBLICO_OBJETIVO_VALUES)[number];
