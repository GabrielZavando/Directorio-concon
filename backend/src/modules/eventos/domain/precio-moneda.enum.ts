/**
 * Currency for event pricing.
 *
 * - `CLP`: Chilean Peso (default)
 * - `USD`: US Dollar
 */
export const PRECIO_MONEDA_VALUES = ["CLP", "USD"] as const;

export type PrecioMoneda = (typeof PRECIO_MONEDA_VALUES)[number];
