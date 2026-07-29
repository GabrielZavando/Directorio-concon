/**
 * Evento approval status — set by admin after reviewing a solicitud.
 *
 * - `pendiente`: default when created via POST /eventos
 * - `aprobado`:  visible publicly
 * - `rechazado`: hidden but persisted
 */
export type EventoStatus = "pendiente" | "aprobado" | "rechazado";
