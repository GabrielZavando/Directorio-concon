/**
 * Unit tests for PlaceApprovalHandlerImpl.
 *
 * Covers all three methods:
 *   - approveRegistro: sets activo + estadoVerificacion='verificado'
 *   - approveReclamo: transfers ownership + auto-rejects other pending reclamos
 *   - rejectReclamo: no-op (just logs)
 */
import { PlaceApprovalHandlerImpl } from "./place-approval.handler";
import type { PlaceRepositoryInterface } from "../domain/place-repository.interface";
import type { SolicitudesRepositoryInterface } from "../domain/solicitudes-repository.interface";

describe("PlaceApprovalHandlerImpl", () => {
  let handler: PlaceApprovalHandlerImpl;
  let mockPlaceRepo: jest.Mocked<PlaceRepositoryInterface>;
  let mockSolicitudRepo: jest.Mocked<SolicitudesRepositoryInterface>;

  beforeEach(() => {
    mockPlaceRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      findForMap: jest.fn(),
      findSinDueno: jest.fn(),
      countByUsuarioId: jest.fn(),
    } as jest.Mocked<PlaceRepositoryInterface>;

    mockSolicitudRepo = {
      create: jest.fn(),
      update: jest.fn(),
      existsByPlaceId: jest.fn(),
      findPendingReclamosByPlaceId: jest.fn(),
    } as unknown as jest.Mocked<SolicitudesRepositoryInterface>;

    handler = new PlaceApprovalHandlerImpl(mockPlaceRepo, mockSolicitudRepo);
  });

  describe("approveRegistro", () => {
    it("sets activo=true + estadoVerificacion='verificado'", async () => {
      await handler.approveRegistro("place-1", "admin-uid");

      expect(mockPlaceRepo.update).toHaveBeenCalledWith("place-1", {
        activo: true,
        estadoVerificacion: "verificado",
        gestionadoPorAdmin: false,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe("approveReclamo", () => {
    it("transfers ownership and auto-rejects other pending reclamos", async () => {
      const otherReclamo = {
        id: "solicitud-other",
        placeId: "place-1",
        usuarioId: "admin-uid",
        tipo: "reclamo-place" as const,
        status: "pendiente" as const,
        solicitanteUid: "other-owner",
        createdAt: new Date(),
      };

      mockSolicitudRepo.findPendingReclamosByPlaceId.mockResolvedValue([
        otherReclamo,
      ]);

      await handler.approveReclamo("place-1", "new-owner", "admin-uid");

      // Ownership transferred
      expect(mockPlaceRepo.update).toHaveBeenCalledWith("place-1", {
        usuarioId: "new-owner",
        gestionadoPorAdmin: false,
        updatedAt: expect.any(Date),
      });

      // Auto-reject the other reclamo
      expect(mockSolicitudRepo.update).toHaveBeenCalledWith("solicitud-other", {
        status: "rechazado",
        comentarios: "Rechazado automáticamente: otro reclamo fue aprobado",
        revisadoPor: "admin-uid",
        revisadoAt: expect.any(Date),
      });
    });

    it("does not call update on solicitudRepo when no other pending reclamos", async () => {
      mockSolicitudRepo.findPendingReclamosByPlaceId.mockResolvedValue([]);

      await handler.approveReclamo("place-1", "new-owner", "admin-uid");

      expect(mockPlaceRepo.update).toHaveBeenCalledTimes(1);
      expect(mockSolicitudRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("rejectReclamo", () => {
    it("does not modify the place (no-op, just logs)", async () => {
      await handler.rejectReclamo("place-1", "solicitud-1", "admin-uid");

      expect(mockPlaceRepo.update).not.toHaveBeenCalled();
      expect(mockSolicitudRepo.update).not.toHaveBeenCalled();
    });
  });
});
