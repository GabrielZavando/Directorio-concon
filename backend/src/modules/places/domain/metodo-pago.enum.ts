/**
 * Controlled enum of payment methods a place accepts.
 * Matches the values defined in docs/data-model.md §places.metodosPago.
 */
export const METODO_PAGO_VALUES = [
  "efectivo",
  "debito",
  "credito",
  "transferencia",
  "qr",
] as const;

export type MetodoPagoEnum = (typeof METODO_PAGO_VALUES)[number];
