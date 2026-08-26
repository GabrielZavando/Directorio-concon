/**
 * Unit tests for SolicitudesService defensive branches:
 * - optional approval handlers missing → explicit Error
 * - no-op / warn switch cases (actualizacion / registro reject)
 */
import { Test } from "@nestjs/testing";
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
describe("SolicitudesService — defensive branches", () => {
  let service: SolicitudesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
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

  it("approves actualizacion with a warn (no place mutation)", async () => {
    const sol = makeSolicitud({ id: "sol-a1", tipo: "actualizacion" });
    mockRepo.findById.mockResolvedValue(sol);
    mockRepo.update.mockResolvedValue(
      makeSolicitud({ ...sol, status: "aprobado" }),
    );

    const result = await service.aprobarSolicitud("sol-a1", "admin-1");

    expect(result.status).toBe("aprobado");
    expect(mockPlaceHandler.approveRegistro).not.toHaveBeenCalled();
  });

  it("rejects registro with a warn (no place mutation)", async () => {
    const sol = makeSolicitud({ id: "sol-r1", tipo: "registro" });
    mockRepo.findById.mockResolvedValue(sol);
    mockRepo.update.mockResolvedValue(
      makeSolicitud({ ...sol, status: "rechazado" }),
    );

    const result = await service.rechazarSolicitud("sol-r1", "admin-1");

    expect(result.status).toBe("rechazado");
    expect(mockPlaceHandler.approveRegistro).not.toHaveBeenCalled();
  });

  it("rejects actualizacion as a no-op", async () => {
    const sol = makeSolicitud({ id: "sol-r2", tipo: "actualizacion" });
    mockRepo.findById.mockResolvedValue(sol);
    mockRepo.update.mockResolvedValue(
      makeSolicitud({ ...sol, status: "rechazado" }),
    );

    const result = await service.rechazarSolicitud("sol-r2", "admin-1");

    expect(result.status).toBe("rechazado");
  });

  // -------------------------------------------------------------------------
  // Missing optional approval handlers → explicit Error (defensive branches)
  // -------------------------------------------------------------------------
  describe("without optional approval handlers", () => {
    let bareService: SolicitudesService;

    beforeEach(() => {
      bareService = new SolicitudesService(
        mockRepo as unknown as SolicitudesRepositoryInterface,
      );
    });

    it("aprobarSolicitud registro-evento throws when no evento handler", async () => {
      mockRepo.findById.mockResolvedValue(
        makeSolicitud({
          id: "sol-x1",
          eventoId: "evento-1",
          tipo: "registro-evento",
          placeId: undefined,
        }),
      );

      await expect(
        bareService.aprobarSolicitud("sol-x1", "admin-1"),
      ).rejects.toThrow("EventoApprovalHandler no está configurado");
    });

    it("aprobarSolicitud actualizacion-evento throws when no evento handler", async () => {
      mockRepo.findById.mockResolvedValue(
        makeSolicitud({
          id: "sol-x2",
          eventoId: "evento-1",
          tipo: "actualizacion-evento",
          placeId: undefined,
        }),
      );

      await expect(
        bareService.aprobarSolicitud("sol-x2", "admin-1"),
      ).rejects.toThrow("EventoApprovalHandler no está configurado");
    });

    it("aprobarSolicitud registro throws when no place handler", async () => {
      mockRepo.findById.mockResolvedValue(
        makeSolicitud({ id: "sol-x3", tipo: "registro" }),
      );

      await expect(
        bareService.aprobarSolicitud("sol-x3", "admin-1"),
      ).rejects.toThrow("PlaceApprovalHandler no está configurado");
    });

    it("rechazarSolicitud registro-evento throws when no evento handler", async () => {
      mockRepo.findById.mockResolvedValue(
        makeSolicitud({
          id: "sol-x4",
          eventoId: "evento-1",
          tipo: "registro-evento",
          placeId: undefined,
        }),
      );

      await expect(
        bareService.rechazarSolicitud("sol-x4", "admin-1"),
      ).rejects.toThrow("EventoApprovalHandler no está configurado");
    });
  });
});
