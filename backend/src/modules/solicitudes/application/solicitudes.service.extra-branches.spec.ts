/**
 * Unit tests for SolicitudesService defensive branches (CH-05).
 *
 * After `solicitudes-refactor` only `reclamo-place` remains, so the legacy
 * `default:` warn cases and the `EventoApprovalHandler` branches are gone.
 * The single remaining defensive branch is the missing `PlaceApprovalHandler`
 * (injected `@Optional()` because the places module provides the concrete
 * handler but solicitudes does not import places).
 */
import { Test } from "@nestjs/testing";
import { SolicitudesService } from "./solicitudes.service";
import { SOLICITUDES_REPOSITORY } from "../domain/solicitudes-repository.token";
import type { SolicitudesRepositoryInterface } from "../domain/solicitudes-repository.interface";
import type { Solicitud } from "../domain/solicitud.entity";
import { PLACE_APPROVAL_HANDLER } from "./approval-handlers";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SolicitudesService — missing place approval handler (defensive)", () => {
  let bareService: SolicitudesService;

  beforeEach(() => {
    jest.clearAllMocks();
    bareService = new SolicitudesService(
      mockRepo as unknown as SolicitudesRepositoryInterface,
      undefined,
    );
  });

  it("aprobarSolicitud throws when no place handler is configured", async () => {
    mockRepo.findById.mockResolvedValue(makeSolicitud({ id: "sol-1" }));

    await expect(
      bareService.aprobarSolicitud("sol-1", "admin-1"),
    ).rejects.toThrow("PlaceApprovalHandler no está configurado");
  });

  it("rechazarSolicitud throws when no place handler is configured", async () => {
    mockRepo.findById.mockResolvedValue(makeSolicitud({ id: "sol-1" }));

    await expect(
      bareService.rechazarSolicitud("sol-1", "admin-1"),
    ).rejects.toThrow("PlaceApprovalHandler no está configurado");
  });

  it("does not update the solicitud when the handler is missing", async () => {
    mockRepo.findById.mockResolvedValue(makeSolicitud({ id: "sol-1" }));

    await expect(
      bareService.aprobarSolicitud("sol-1", "admin-1"),
    ).rejects.toThrow();

    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Missing handler via the Nest module (token not provided) → resolves to null
  // -------------------------------------------------------------------------
  it("resolves PLACE_APPROVAL_HANDLER as undefined via @Optional() when not provided", async () => {
    const module = await Test.createTestingModule({
      providers: [
        SolicitudesService,
        { provide: SOLICITUDES_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    const service = module.get<{ placeHandler?: unknown }>(
      SolicitudesService as never,
    );

    expect(service.placeHandler).toBeUndefined();
  });
});
