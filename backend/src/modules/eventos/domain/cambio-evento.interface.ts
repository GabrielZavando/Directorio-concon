/**
 * Audit entry recording a single field change on an `Evento`.
 *
 * Populated on every `PUT /eventos/:id` (and explicitly when a verified
 * evento is reverted to `pendiente`). `valorAnterior`/`valorNuevo` are typed
 * as `unknown` because any domain field may change.
 */
export interface CambioEvento {
  campo: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
  fecha: Date;
  usuarioId: string;
}
