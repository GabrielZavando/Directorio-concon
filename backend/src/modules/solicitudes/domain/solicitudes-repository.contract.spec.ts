/**
 * LSP contract test for SolicitudesRepositoryInterface (solicitudes/domain).
 *
 * Validates that any implementation of this interface satisfies the contract
 * needed by the solicitudes feature. CH-05 (solicitudes-refactor):
 *
 *  - `existsByPlaceId` is REMOVED from this interface (it lives only on the
 *    places-local interface/`SolicitudesFirestoreAdapter` for the places
 *    module's delete-guard).
 *  - `findPendingQueue(status, page, limit)` is ADDED to back the admin queue
 *    listing (`GET /solicitudes`), returning `{ data, total }`.
 *  - `tipo` is restricted to the single `'reclamo-place'` literal.
 */
import type {
  SolicitudesRepositoryInterface,
  CreateSolicitudInput,
  PaginatedSolicitudes,
} from "./solicitudes-repository.interface";
import type { Solicitud } from "./solicitud.entity";

// ---------------------------------------------------------------------------
// Dummy implementation — satisfies the interface for compile-time checks
// ---------------------------------------------------------------------------
class DummySolicitudesRepository implements SolicitudesRepositoryInterface {
  async create(input: CreateSolicitudInput): Promise<Solicitud> {
    return {
      id: "sol-1",
      placeId: input.placeId,
      usuarioId: input.usuarioId,
      tipo: input.tipo,
      status: input.status,
      solicitanteUid: input.solicitanteUid,
      createdAt: input.createdAt,
    };
  }

  async findById(id: string): Promise<Solicitud | null> {
    return id ? null : null;
  }

  async findPendingReclamosByPlaceId(_placeId: string): Promise<Solicitud[]> {
    return [];
  }

  async findPendingQueue(
    _status: Solicitud["status"],
    _page: number,
    _limit: number,
  ): Promise<PaginatedSolicitudes> {
    return { items: [], total: 0 };
  }

  async update(_id: string, _patch: Partial<Solicitud>): Promise<Solicitud> {
    return {
      id: "sol-1",
      placeId: "place-1",
      usuarioId: "user-1",
      tipo: "reclamo-place",
      status: "pendiente",
      solicitanteUid: "uid-1",
      createdAt: new Date(),
    };
  }
}

// ---------------------------------------------------------------------------
// Contract tests
// ---------------------------------------------------------------------------
describe("SolicitudesRepositoryInterface (LSP contract, solicitudes/domain)", () => {
  let repo: SolicitudesRepositoryInterface;

  beforeEach(() => {
    repo = new DummySolicitudesRepository();
  });

  it("create returns a Solicitud of tipo reclamo-place", async () => {
    const input: CreateSolicitudInput = {
      placeId: "place-1",
      usuarioId: "pub-1",
      tipo: "reclamo-place",
      status: "pendiente",
      solicitanteUid: "claim-1",
      createdAt: new Date(),
    };
    const result = await repo.create(input);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.tipo).toBe("reclamo-place");
    expect(result.solicitanteUid).toBe("claim-1");
  });

  it("findPendingQueue returns a paginated result with total", async () => {
    const result = await repo.findPendingQueue("pendiente", 1, 20);
    expect(result).toHaveProperty("items");
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("findPendingReclamosByPlaceId returns array of Solicitud", async () => {
    const result = await repo.findPendingReclamosByPlaceId("place-1");
    expect(Array.isArray(result)).toBe(true);
  });

  it("update returns a Solicitud", async () => {
    const result = await repo.update("sol-1", { status: "aprobado" });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
});
