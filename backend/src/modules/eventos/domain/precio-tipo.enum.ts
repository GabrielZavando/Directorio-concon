/**
 * Type of event pricing.
 *
 * - `gratis`:     free entry, precioValor must be 0
 * - `pago`:       paid entry, precioValor must be > 0
 * - `donacion`:   donation-based, precioValor may be 0 or > 0
 * - `invitacion`: invitation-only, precioValor typically 0
 */
export const PRECIO_TIPO_VALUES = [
  "gratis",
  "pago",
  "donacion",
  "invitacion",
] as const;

export type PrecioTipo = (typeof PRECIO_TIPO_VALUES)[number];
