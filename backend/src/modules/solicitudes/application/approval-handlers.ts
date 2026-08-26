/**
 * Handler interfaces for updating associated entities during solicitud approval/rejection.
 *
 * These interfaces live in the solicitudes module to maintain DIP:
 * - SolicitudesService depends on these abstractions
 * - Concrete implementations (e.g., EventoApprovalHandlerImpl) are provided by
 *   their respective modules (eventos, places) via DI
 */

// ---------------------------------------------------------------------------
// Evento approval handler
// ---------------------------------------------------------------------------

export interface EventoApprovalHandler {
  /** Approve a 'registro-evento' solicitud: set evento status to 'aprobado'. */
  approveRegistro(eventoId: string, adminUid: string): Promise<void>;

  /** Apply proposal from an 'actualizacion-evento' solicitud. */
  applyProposal(
    eventoId: string,
    proposal: Record<string, unknown>,
  ): Promise<void>;

  /** Reject a 'registro-evento' solicitud: set evento status to 'rechazado'. */
  rejectRegistro(eventoId: string, adminUid: string): Promise<void>;
}

export const EVENTO_APPROVAL_HANDLER = "EventoApprovalHandler";

// ---------------------------------------------------------------------------
// Place approval handler
// ---------------------------------------------------------------------------

export interface PlaceApprovalHandler {
  /** Approve a 'registro' solicitud: set place to activo + verificado. */
  approveRegistro(placeId: string, adminUid: string): Promise<void>;

  /** Approve a 'reclamo-place' solicitud: transfer ownership + auto-reject other reclamos. */
  approveReclamo(
    placeId: string,
    solicitanteUid: string,
    adminUid: string,
  ): Promise<void>;

  /** Reject a 'reclamo-place' solicitud: no side-effect on place. */
  rejectReclamo(
    placeId: string,
    solicitudId: string,
    adminUid: string,
  ): Promise<void>;
}

export const PLACE_APPROVAL_HANDLER = "PlaceApprovalHandler";
