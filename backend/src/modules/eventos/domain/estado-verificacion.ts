/**
 * Verification state shared by `eventos` and `places`.
 *
 * Pure union type (no framework deps) so it can be imported by both
 * aggregates without creating infrastructure coupling.
 */
export type EstadoVerificacion = "pendiente" | "verificado" | "rechazado";

export const ESTADO_VERIFICACION_VALUES: readonly EstadoVerificacion[] = [
  "pendiente",
  "verificado",
  "rechazado",
] as const;
