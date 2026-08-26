/**
 * Domain entity for a Solicitud (approval request).
 *
 * Solicitudes are used for both places and eventos approval flows.
 * A solicitud references either placeId OR eventoId (XOR constraint).
 *
 * Updated by places-refactor (CH-03): added `reclamo-place` tipo
 * and `solicitanteUid` field for place claiming.
 */
export interface Solicitud {
  id: string;
  placeId?: string;
  eventoId?: string;
  usuarioId: string;
  tipo:
    | "registro"
    | "actualizacion"
    | "registro-evento"
    | "actualizacion-evento"
    | "reclamo-place";
  status: "pendiente" | "aprobado" | "rechazado";
  proposal?: Record<string, unknown>;
  comentarios?: string;
  solicitanteUid?: string;
  revisadoPor?: string;
  createdAt: Date;
  revisadoAt?: Date;
}
