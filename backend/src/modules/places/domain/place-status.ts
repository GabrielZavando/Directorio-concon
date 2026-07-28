/**
 * Place approval status — set by admin after reviewing a solicitud.
 *
 * - `pendiente`: default when created via POST /places
 * - `aprobado`:  visible publicly (Flujo 2)
 * - `rechazado`: hidden but persisted
 */
export type PlaceStatus = "pendiente" | "aprobado" | "rechazado";
