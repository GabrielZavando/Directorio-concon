/**
 * Evento lifecycle status — set by publisher or admin.
 *
 * - `borrador`:   initial state when created (pending approval)
 * - `programado`: approved and scheduled
 * - `en_curso`:   event is currently happening (manual transition)
 * - `finalizado`: event has ended (manual transition)
 * - `cancelado`:  event cancelled before/during
 * - `suspendido`: temporarily suspended
 *
 * Auto-transitions (programado→en_curso→finalizado based on
 * fechaInicio/fechaFin) are Non-Goal in this change.
 */
export const EVENTO_ESTADO_VALUES = [
  "borrador",
  "programado",
  "en_curso",
  "finalizado",
  "cancelado",
  "suspendido",
] as const;

export type EventoEstado = (typeof EVENTO_ESTADO_VALUES)[number];
