/**
 * Domain entity for a Solicitud (approval request).
 *
 * After CH-05 solicitudes-refactor: only 'reclamo-place' type remains.
 * References placeId only (eventoId removed). Required fields: placeId, solicitanteUid.
 *
 * Updated by places-refactor (CH-03): added `reclamo-place` tipo
 * and `solicitanteUid` field for place claiming.
 * CH-05: reduced to only reclamo-place, removed eventoId and proposal,
 * made placeId and solicitanteUid required.
 */
export interface Solicitud {
  id: string;
  placeId: string; // REQUIRED for reclamo-place type
  usuarioId: string;
  tipo: "reclamo-place";
  status: "pendiente" | "aprobado" | "rechazado";
  solicitanteUid: string; // REQUIRED for all types
  comentarios?: string;
  revisadoPor?: string;
  createdAt: Date;
  revisadoAt?: Date;
}

/**
 * The only solicitud `tipo` after CH-05 (solicitudes-refactor).
 * Kept as a domain constant so runtime comparisons and persistence writes
 * reference a single source instead of repeating the literal.
 */
export const SOLICITUD_TIPO_RECLAMO_PLACE = "reclamo-place" as const;
