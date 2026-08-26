/**
 * @deprecated Use `EstadoVerificacion` from `./estado-verificacion` instead.
 *
 * This type is kept temporarily for backward compatibility with the
 * infrastructure layer (adapter, controller, service) which still
 * references `PlaceStatus`. It will be removed once those files are
 * migrated in tasks 4, 6, and 7 of the places-refactor (CH-03) change.
 *
 * The new model uses `activo: boolean` + `estadoVerificacion: EstadoVerificacion`
 * instead of `status: PlaceStatus`.
 */
export type PlaceStatus = "pendiente" | "aprobado" | "rechazado";
