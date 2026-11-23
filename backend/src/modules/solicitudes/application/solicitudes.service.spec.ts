/**
 * Unit tests for SolicitudesService (CH-05 solicitudes-refactor).
 *
 * Only `reclamo-place` remains. Covers:
 *  - `create`: rejects removed `eventoId` (400, exact message), rejects
 *    non-`reclamo-place`/missing `placeId` (400, exact message), delegates
 *    valid creates to the repository.
 *  - `listarSolicitudes`: admin queue envelope `{ data, meta }` with default
 *    filters and pagination.
 *  - `aprobarSolicitud` / `rechazarSolicitud`: 404 / 409 invariants and
 *    delegation to `PlaceApprovalHandler.approveReclamo` / `rejectReclamo`.
 */
import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { SolicitudesService } from "./solicitudes.service";
import { SOLICITUDES_REPOSITORY } from "../domain/solicitudes-repository.token";
import type { SolicitudesRepositoryInterface } from "../domain/solicitudes-repository.interface";
import type { Solicitud } from "../domain/solicitud.entity";
import {
  PLACE_APPROVAL_HANDLER,
  type PlaceApprovalHandler,
} from "./approval-handlers";

const CAMPO_REMOVIDO_MSG =
  "El campo 'eventoId' ha sido removido en CH-05 solicitudes-refactor. Use placeId para solicitudes de tipo 'reclamo-place'.";
const TIPO_NO_PERMITIDO_MSG =
  "Tipo de solicitud no permitido en esta fase. Solo 'reclamo-place' es válido.";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRepo: jest.Mocked<SolicitudesRepositoryInterface> = {
  create: jest.fn(),
  findById: jest.fn(),
  findPendingReclamosByPlaceId: jest.fn(),
  findPendingQueue: jest.fn(),
  update: jest.fn(),
};

const mockPlaceHandler: jest.Mocked<PlaceApprovalHandler> = {
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
    usuarioId: "user-abc",
    tipo: "reclamo-place",
    status: "pendiente",
    solicitanteUid: "claim-1",
    comentarios: undefined,
    revisadoPor: undefined,
    createdAt: new Date("2026-01-01"),
    revisadoAt: undefined,
    ...overrides,
  };
}

const baseInput = {
  usuarioId: "user-abc",
  status: "pendiente" as const,
  createdAt: new Date("2026-01-01"),
};

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
        { provide: PLACE_APPROVAL_HANDLER, useValue: mockPlaceHandler },
      ],
    }).compile();

    service = module.get(SolicitudesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("rejects a create input carrying the removed eventoId field (400, exact message)", async () => {
      const call = service.create({
        ...baseInput,
        placeId: "p1",
        eventoId: "e1",
        tipo: "reclamo-place",
        solicitanteUid: "claim-1",
      });

      await expect(call).rejects.toThrow(BadRequestException);
      await expect(call).rejects.toThrow(CAMPO_REMOVIDO_MSG);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("rejects a non-'reclamo-place' tipo (400, exact message)", async () => {
      const call = service.create({
        ...baseInput,
        placeId: "p1",
        tipo: "registro" as "reclamo-place",
        solicitanteUid: "claim-1",
      });

      await expect(call).rejects.toThrow(BadRequestException);
      await expect(call).rejects.toThrow(TIPO_NO_PERMITIDO_MSG);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("rejects a missing placeId (400, exact message)", async () => {
      const call = service.create({
        ...baseInput,
        placeId: undefined as unknown as string,
        tipo: "reclamo-place",
        solicitanteUid: "claim-1",
      });

      await expect(call).rejects.toThrow(BadRequestException);
      await expect(call).rejects.toThrow(TIPO_NO_PERMITIDO_MSG);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("delegates a valid reclamo-place create to the repository", async () => {
      const expected = makeSolicitud();
      mockRepo.create.mockResolvedValue(expected);

      const result = await service.create({
        ...baseInput,
        placeId: "place-1",
        tipo: "reclamo-place",
        solicitanteUid: "claim-1",
      });

      expect(result).toEqual(expected);
      expect(mockRepo.create).toHaveBeenCalledWith({
        ...baseInput,
        placeId: "place-1",
        tipo: "reclamo-place",
        solicitanteUid: "claim-1",
        createdAt: expect.any(Date),
      });
    });
  });

  describe("listarSolicitudes", () => {
    it("returns the { data, meta } envelope from the repository queue (defaults to pendiente)", async () => {
      mockRepo.findPendingQueue.mockResolvedValue({
        items: [makeSolicitud()],
        total: 1,
      });

      const result = await service.listarSolicitudes({});

      expect(result).toEqual({
        data: [makeSolicitud()],
        meta: { page: 1, limit: 20, total: 1 },
      });
      expect(mockRepo.findPendingQueue).toHaveBeenCalledWith(
        "pendiente",
        1,
        20,
      );
    });

    it("passes through explicit status/page/limit filters", async () => {
      mockRepo.findPendingQueue.mockResolvedValue({ items: [], total: 0 });

      await service.listarSolicitudes({
        status: "rechazado",
        page: 3,
        limit: 10,
      });

      expect(mockRepo.findPendingQueue).toHaveBeenCalledWith(
        "rechazado",
        3,
        10,
      );
    });
  });

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

    it("approves reclamo-place and calls place handler approveReclamo", async () => {
      const sol = makeSolicitud({
        id: "sol-rc1",
        placeId: "place-1",
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

      const result = await service.aprobarSolicitud("sol-rc1", "admin-1");

      expect(mockPlaceHandler.approveReclamo).toHaveBeenCalledWith(
        "place-1",
        "claimant-uid",
        "admin-1",
      );
      expect(result.status).toBe("aprobado");
      expect(result.revisadoPor).toBe("admin-1");
      expect(mockRepo.update).toHaveBeenCalledWith(
        "sol-rc1",
        expect.objectContaining({ status: "aprobado", revisadoPor: "admin-1" }),
      );
    });
  });

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

    it("rejects reclamo-place and calls place handler rejectReclamo", async () => {
      const sol = makeSolicitud({
        id: "sol-rc1",
        placeId: "place-1",
        solicitanteUid: "claimant-uid",
      });
      mockRepo.findById.mockResolvedValue(sol);
      mockRepo.update.mockResolvedValue(
        makeSolicitud({ ...sol, status: "rechazado" }),
      );

      const result = await service.rechazarSolicitud(
        "sol-rc1",
        "admin-1",
        "Reclamo no válido",
      );

      expect(mockPlaceHandler.rejectReclamo).toHaveBeenCalledWith(
        "place-1",
        "sol-rc1",
        "admin-1",
      );
      expect(result.status).toBe("rechazado");
      expect(mockRepo.update).toHaveBeenCalledWith(
        "sol-rc1",
        expect.objectContaining({ comentarios: "Reclamo no válido" }),
      );
    });
  });
});
