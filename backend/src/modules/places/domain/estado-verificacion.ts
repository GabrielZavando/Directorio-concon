/**
 * Place verification status — set by admin via POST /places/:id/verificar.
 *
 * - `pendiente`: default when created; place is visible but without badge
 * - `verificado`: admin verified; green badge shown publicly
 * - `rechazado`: admin rejected; place is deactivated (activo: false)
 *
 * Replaces the old `PlaceStatus` type (places-refactor CH-03).
 */
export type EstadoVerificacion = "pendiente" | "verificado" | "rechazado";
