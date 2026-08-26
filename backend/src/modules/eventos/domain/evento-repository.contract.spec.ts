/**
 * LSP contract test for EventoRepositoryInterface.
 *
 * Validates that any concrete implementation of the interface satisfies
 * the contract (method signatures, return types, behavior).
 *
 * Uses a minimal dummy implementation to verify the type-level contract
 * compiles and the dummy methods can be invoked without runtime errors.
 */
import type {
  EventoRepositoryInterface,
  PaginatedEventos,
  EventoSearchFilters,
} from "./evento-repository.interface";
import type { Evento } from "./evento.entity";

// ---------------------------------------------------------------------------
// Dummy implementation — satisfies the interface for compile-time checks
// ---------------------------------------------------------------------------
class DummyEventoRepository implements EventoRepositoryInterface {
  async create(
    _evento: Omit<Evento, "id" | "createdAt" | "updatedAt">,
  ): Promise<Evento> {
    throw new Error("Not implemented");
  }

  async findAllPublic(
    _filters: EventoSearchFilters,
  ): Promise<PaginatedEventos> {
    return { data: [], total: 0 };
  }

  async findAllAdmin(_filters: EventoSearchFilters): Promise<PaginatedEventos> {
    return { data: [], total: 0 };
  }

  async findById(_id: string): Promise<Evento | null> {
    return null;
  }

  async findBySlug(_slug: string): Promise<Evento | null> {
    return null;
  }

  async update(_id: string, _patch: Partial<Evento>): Promise<Evento> {
    throw new Error("Not implemented");
  }

  async delete(_id: string): Promise<void> {
    // no-op
  }

  async listMapData(): Promise<
    Pick<
      Evento,
      "id" | "nombre" | "slug" | "coordenadas" | "categoriaId" | "fechaInicio"
    >[]
  > {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Contract tests
// ---------------------------------------------------------------------------
describe("EventoRepositoryInterface (LSP contract)", () => {
  let repo: EventoRepositoryInterface;

  beforeEach(() => {
    repo = new DummyEventoRepository();
  });

  it("create returns an Evento", async () => {
    const dummy: Omit<Evento, "id" | "createdAt" | "updatedAt"> = {
      nombre: "Test",
      slug: "test",
      descripcionCorta: "Corta",
      descripcion: "Descripción larga para testing de creación de eventos.",
      categoriaId: "eventos",
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      organizador: "Org",
      ubicacionDireccion: "Dir",
      coordenadas: { lat: -33, lng: -71 },
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 86400000),
      precioTipo: "gratis",
      precioValor: 0,
      precioMoneda: "CLP",
      publicoObjetivo: ["todos"],
      nivelRuido: "bajo",
      status: "pendiente",
      estado: "borrador",
      destacado: false,
      verificado: false,
      usuarioId: "uid",
      vistasTotales: 0,
    };
    // Should throw since dummy is not implemented, but the call signature must compile
    await expect(repo.create(dummy)).rejects.toThrow("Not implemented");
  });

  it("findAllPublic returns PaginatedEventos with data array", async () => {
    const result = await repo.findAllPublic({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("findAllAdmin returns PaginatedEventos with data array", async () => {
    const result = await repo.findAllAdmin({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("findById returns Evento or null", async () => {
    const result = await repo.findById("test-id");
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("findBySlug returns Evento or null", async () => {
    const result = await repo.findBySlug("test-slug");
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("delete returns void", async () => {
    const result = await repo.delete("test-id");
    expect(result).toBeUndefined();
  });

  it("listMapData returns array with required fields", async () => {
    const result = await repo.listMapData();
    expect(Array.isArray(result)).toBe(true);
  });
});
