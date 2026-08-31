/**
 * LSP contract test for SolicitudesRepositoryInterface (places/domain).
 *
 * Validates that any implementation of this minimal interface satisfies
 * the contract needed by the places feature.
 *
 * Created by places-refactor (CH-03): added findPendingReclamosByPlaceId.
 */
import type {
  SolicitudesRepositoryInterface,
  Solicitud,
  CreateSolicitudInput,
} from "./solicitudes-repository.interface";

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

  async update(
    _id: string,
    _patch: Partial<
      Pick<Solicitud, "status" | "comentarios" | "revisadoPor" | "revisadoAt">
    >,
  ): Promise<Solicitud> {
    return {
      id: "sol-1",
      placeId: "place-1",
      usuarioId: "user-1",
      tipo: "registro",
      status: "pendiente",
      createdAt: new Date(),
    };
  }

  async existsByPlaceId(_placeId: string): Promise<boolean> {
    return false;
  }

  async findPendingReclamosByPlaceId(_placeId: string): Promise<Solicitud[]> {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Contract tests
// ---------------------------------------------------------------------------
describe("SolicitudesRepositoryInterface (LSP contract, places/domain)", () => {
  let repo: SolicitudesRepositoryInterface;

  beforeEach(() => {
    repo = new DummySolicitudesRepository();
  });

  it("create returns a Solicitud", async () => {
    const input: CreateSolicitudInput = {
      placeId: "place-1",
      usuarioId: "uid-1",
      tipo: "registro",
      status: "pendiente",
      createdAt: new Date(),
    };
    const result = await repo.create(input);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("existsByPlaceId returns a boolean", async () => {
    const result = await repo.existsByPlaceId("place-1");
    expect(typeof result).toBe("boolean");
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
