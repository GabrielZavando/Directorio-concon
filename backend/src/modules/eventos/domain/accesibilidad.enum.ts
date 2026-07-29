/**
 * Accessibility features for an event venue.
 *
 * - `acceso-silla-ruedas`:      wheelchair-accessible entrance
 * - `banos-accesibles`:         accessible restrooms
 * - `estacionamiento-reservado`: reserved parking
 * - `interprete-señas`:         sign language interpreter
 * - `material-braille`:         braille materials
 * - `rampa-acceso`:             access ramp
 */
export const ACCESIBILIDAD_VALUES = [
  "acceso-silla-ruedas",
  "banos-accesibles",
  "estacionamiento-reservado",
  "interprete-señas",
  "material-braille",
  "rampa-acceso",
] as const;

export type AccesibilidadEnum = (typeof ACCESIBILIDAD_VALUES)[number];
