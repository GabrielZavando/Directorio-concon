/**
 * Unit tests for SolicitudesService.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { SolicitudesService } from "./solicitudes.service";
import { SOLICITUDES_REPOSITORY } from "../domain/solicitudes-repository.token";
import type { SolicitudesRepositoryInterface } from "../domain/solicitudes-repository.interface";
import type { Solicitud } from "../domain/solicitud.entity";
import {
  EVENTO_APPROVAL_HANDLER,
  PLACE_APPROVAL_HANDLER,
  type EventoApprovalHandler,
  type PlaceApprovalHandler,
} from "./approval-handlers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRepo: jest.Mocked<SolicitudesRepositoryInterface> = {
  create: jest.fn(),
  findById: jest.fn(),
  existsByPlaceId: jest.fn(),
  existsPendingByEventoId: jest.fn(),
  findPendingReclamosByPlaceId: jest.fn(),
  update: jest.fn(),
};

const mockEventoHandler: jest.Mocked<EventoApprovalHandler> = {
  approveRegistro: jest.fn(),
  applyProposal: jest.fn(),
  rejectRegistro: jest.fn(),
};

const mockPlaceHandler: jest.Mocked<PlaceApprovalHandler> = {
  approveRegistro: jest.fn(),
  approveReclamo: jest.fn(),
  rejectReclamo: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSolicitud(overrides: Partial<Solicitud> = {}): Solicitud {
  return {
    id: "sol-1",
    placeId: "place-1",
    eventoId: undefined,
    usuarioId: "user-abc",
    tipo: "registro",
    status: "pendiente",
    proposal: undefined,
    comentarios: undefined,
    revisadoPor: undefined,
    createdAt: new Date("2026-01-01"),
    revisadoAt: undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SolicitudesService", () => {
  let service: SolicitudesService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitudesService,
        { provide: SOLICITUDES_REPOSITORY, useValue: mockRepo },
        { provide: EVENTO_APPROVAL_HANDLER, useValue: mockEventoHandler },
        { provide: PLACE_APPROVAL_HANDLER, useValue: mockPlaceHandler },
      ],
    }).compile();

    service = module.get(SolicitudesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // create (places interface)
  // =========================================================================
  describe("create", () => {
    it("creates a solicitud via the repository", async () => {
      const expected = makeSolicitud();
      mockRepo.create.mockResolvedValue(expected);

      const result = await service.create({
        placeId: "place-1",
        usuarioId: "user-abc",
        tipo: "registro",
        status: "pendiente",
        createdAt: new Date("2026-01-01"),
      });

      expect(result).toEqual(expected);
      expect(mockRepo.create).toHaveBeenCalledWith({
        placeId: "place-1",
        usuarioId: "user-abc",
        tipo: "registro",
        status: "pendiente",
        createdAt: expect.any(Date),
      });
    });
  });

  // =========================================================================
  // existsByPlaceId
  // =========================================================================
  describe("existsByPlaceId", () => {
    it("delegates to repository", async () => {
      mockRepo.existsByPlaceId.mockResolvedValue(true);

      const result = await service.existsByPlaceId("place-1");

      expect(result).toBe(true);
      expect(mockRepo.existsByPlaceId).toHaveBeenCalledWith("place-1");
    });
  });

  // =========================================================================
  // createEventoSolicitud (eventos interface)
  // =========================================================================
  describe("createEventoSolicitud", () => {
    it("creates a solicitud and returns id", async () => {
      mockRepo.create.mockResolvedValue(
        makeSolicitud({
          id: "sol-e1",
          eventoId: "evento-1",
          tipo: "registro-evento",
        }),
      );

      const result = await service.createEventoSolicitud({
        eventoId: "evento-1",
        usuarioId: "user-abc",
        tipo: "registro-evento",
        status: "pendiente",
        createdAt: new Date("2026-01-01"),
      });

      expect(result.id).toBe("sol-e1");
      expect(mockRepo.create).toHaveBeenCalledWith({
        eventoId: "evento-1",
        usuarioId: "user-abc",
        tipo: "registro-evento",
        status: "pendiente",
        createdAt: expect.any(Date),
      });
    });
  });

  // =========================================================================
  // XOR constraint (placeId ⊕ eventoId) — enforced at the application boundary
  // =========================================================================
  const XOR_MSG =
    "Una solicitud debe referenciar exactamente un placeId o eventoId (XOR)";
  const baseInput = {
    usuarioId: "user-abc",
    status: "pendiente" as const,
    createdAt: new Date("2026-01-01"),
  };
  const bothReg = { placeId: "p1", eventoId: "e1", tipo: "registro" } as const;
  const bothEv = {
    placeId: "p1",
    eventoId: "e1",
    tipo: "registro-evento",
  } as const;

  it.each([
    ["both", bothReg],
    ["both-evento", bothEv],
    ["none", { tipo: "registro" }],
    ["mismatch", { placeId: "p1", tipo: "registro-evento" }],
  ] as const)("create %s (400)", async (_label, refs) => {
    const call = service.create({ ...baseInput, ...refs });
    await expect(call).rejects.toThrow(XOR_MSG);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it.each([
    ["both", bothEv],
    ["none", { tipo: "registro-evento" }],
  ] as const)("createEvento %s (400)", async (_label, refs) => {
    const call = service.createEventoSolicitud({ ...baseInput, ...refs });
    await expect(call).rejects.toThrow(XOR_MSG);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  // =========================================================================
  // existsPendingByEventoId
  // =========================================================================
  describe("existsPendingByEventoId", () => {
    it("delegates to repository", async () => {
      mockRepo.existsPendingByEventoId.mockResolvedValue(true);

      const result = await service.existsPendingByEventoId("evento-1");

      expect(result).toBe(true);
      expect(mockRepo.existsPendingByEventoId).toHaveBeenCalledWith("evento-1");
    });
  });

  // =========================================================================
  // aprobarSolicitud
  // =========================================================================
  describe("aprobarSolicitud", () => {
    it("throws NotFoundException when solicitud does not exist", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.aprobarSolicitud("sol-missing", "admin-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException when solicitud is not pending", async () => {
      mockRepo.findById.mockResolvedValue(
        makeSolicitud({ status: "aprobado" }),
      );

      await expect(
        service.aprobarSolicitud("sol-1", "admin-1"),
      ).rejects.toThrow(ConflictException);
    });

    it("approves registro-evento and calls evento handler", async () => {
      const sol = makeSolicitud({
        id: "sol-e1",
        eventoId: "evento-1",
        tipo: "registro-evento",
        placeId: undefined,
      });
      mockRepo.findById.mockResolvedValue(sol);
      mockRepo.update.mockResolvedValue(
        makeSolicitud({
          ...sol,
          status: "aprobado",
          revisadoPor: "admin-1",
          revisadoAt: new Date(),
        }),
      );

      const result = await service.aprobarSolicitud("sol-e1", "admin-1");

      expect(mockEventoHandler.approveRegistro).toHaveBeenCalledWith(
        "evento-1",
        "admin-1",
      );
      expect(result.status).toBe("aprobado");
      expect(result.revisadoPor).toBe("admin-1");
    });

    it("approves actualizacion-evento and applies proposal", async () => {
      const sol = makeSolicitud({
        id: "sol-e2",
        eventoId: "evento-1",
        tipo: "actualizacion-evento",
        proposal: { nombre: "Evento Actualizado" },
        placeId: undefined,
      });
      mockRepo.findById.mockResolvedValue(sol);
      mockRepo.update.mockResolvedValue(
        makeSolicitud({
          ...sol,
          status: "aprobado",
          revisadoPor: "admin-1",
        }),
      );

      await service.aprobarSolicitud("sol-e2", "admin-1");

      expect(mockEventoHandler.applyProposal).toHaveBeenCalledWith("evento-1", {
        nombre: "Evento Actualizado",
      });
    });

    it("approves registro and calls place handler", async () => {
      const sol = makeSolicitud({
        id: "sol-p1",
        placeId: "place-1",
        tipo: "registro",
        eventoId: undefined,
      });
      mockRepo.findById.mockResolvedValue(sol);
      mockRepo.update.mockResolvedValue(
        makeSolicitud({
          ...sol,
          status: "aprobado",
          revisadoPor: "admin-1",
        }),
      );

      await service.aprobarSolicitud("sol-p1", "admin-1");

      expect(mockPlaceHandler.approveRegistro).toHaveBeenCalledWith(
        "place-1",
        "admin-1",
      );
    });

    it("approves reclamo-place and calls place handler approveReclamo", async () => {
      const sol = makeSolicitud({
        id: "sol-rc1",
        placeId: "place-1",
        tipo: "reclamo-place",
        eventoId: undefined,
        solicitanteUid: "claimant-uid",
      });
      mockRepo.findById.mockResolvedValue(sol);
      mockRepo.update.mockResolvedValue(
        makeSolicitud({
          ...sol,
          status: "aprobado",
          revisadoPor: "admin-1",
        }),
      );

      await service.aprobarSolicitud("sol-rc1", "admin-1");

      expect(mockPlaceHandler.approveReclamo).toHaveBeenCalledWith(
        "place-1",
        "claimant-uid",
        "admin-1",
      );
    });
  });

  // =========================================================================
  // rechazarSolicitud
  // =========================================================================
  describe("rechazarSolicitud", () => {
    it("throws NotFoundException when solicitud does not exist", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.rechazarSolicitud("sol-missing", "admin-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException when solicitud is not pending", async () => {
      mockRepo.findById.mockResolvedValue(
        makeSolicitud({ status: "rechazado" }),
      );

      await expect(
        service.rechazarSolicitud("sol-1", "admin-1"),
      ).rejects.toThrow(ConflictException);
    });

    it("rejects registro-evento and calls evento handler", async () => {
      const sol = makeSolicitud({
        id: "sol-e1",
        eventoId: "evento-1",
        tipo: "registro-evento",
        placeId: undefined,
      });
      mockRepo.findById.mockResolvedValue(sol);
      mockRepo.update.mockResolvedValue(
        makeSolicitud({
          ...sol,
          status: "rechazado",
          revisadoPor: "admin-1",
        }),
      );

      const result = await service.rechazarSolicitud(
        "sol-e1",
        "admin-1",
        "Documentación incompleta",
      );

      expect(mockEventoHandler.rejectRegistro).toHaveBeenCalledWith(
        "evento-1",
        "admin-1",
      );
      expect(result.status).toBe("rechazado");
      expect(mockRepo.update).toHaveBeenCalledWith(
        "sol-e1",
        expect.objectContaining({ comentarios: "Documentación incompleta" }),
      );
    });

    it("rejects actualizacion-evento without calling evento handler", async () => {
      const sol = makeSolicitud({
        id: "sol-e2",
        eventoId: "evento-1",
        tipo: "actualizacion-evento",
        placeId: undefined,
      });
      mockRepo.findById.mockResolvedValue(sol);
      mockRepo.update.mockResolvedValue(
        makeSolicitud({ ...sol, status: "rechazado" }),
      );

      await service.rechazarSolicitud("sol-e2", "admin-1");

      expect(mockEventoHandler.rejectRegistro).not.toHaveBeenCalled();
    });

    it("rejects reclamo-place and calls place handler rejectReclamo", async () => {
      const sol = makeSolicitud({
        id: "sol-rc1",
        placeId: "place-1",
        tipo: "reclamo-place",
        eventoId: undefined,
        solicitanteUid: "claimant-uid",
      });
      mockRepo.findById.mockResolvedValue(sol);
      mockRepo.update.mockResolvedValue(
        makeSolicitud({ ...sol, status: "rechazado" }),
      );

      await service.rechazarSolicitud(
        "sol-rc1",
        "admin-1",
        "Reclamo no válido",
      );

      expect(mockPlaceHandler.rejectReclamo).toHaveBeenCalledWith(
        "place-1",
        "sol-rc1",
        "admin-1",
      );
      expect(mockRepo.update).toHaveBeenCalledWith(
        "sol-rc1",
        expect.objectContaining({ comentarios: "Reclamo no válido" }),
      );
    });
  });
});
