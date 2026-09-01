/**
 * Handler interfaces for updating associated entities during solicitud approval/rejection.
 *
 * These interfaces live in the solicitudes module to maintain DIP:
 * - SolicitudesService depends on these abstractions
 * - Concrete implementations (e.g., PlaceApprovalHandlerImpl) are provided by
 *   their respective modules (places) via DI
 *
 * CH-05 (solicitudes-refactor): removed `EventoApprovalHandler` +
 * `EVENTO_APPROVAL_HANDLER` (evento solicitudes are gone) and
 * `PlaceApprovalHandler.approveRegistro` (legacy `registro` tipo removed).
 * Only the `reclamo-place` handlers remain.
 */

// ---------------------------------------------------------------------------
// Place approval handler
// ---------------------------------------------------------------------------

export interface PlaceApprovalHandler {
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
