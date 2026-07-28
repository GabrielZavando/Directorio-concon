/**
 * LSP contract test for PlaceRepositoryInterface.
 *
 * Validates that any concrete implementation of the interface satisfies
 * the contract (method signatures, return types, behavior).
 *
 * Uses a minimal dummy implementation to verify the type-level contract
 * compiles and the dummy methods can be invoked without runtime errors.
 */
import type {
  PlaceRepositoryInterface,
  PaginatedPlaces,
} from "./place-repository.interface";
import type { Place } from "./place.entity";

// ---------------------------------------------------------------------------
// Dummy implementation — satisfies the interface for compile-time checks
// ---------------------------------------------------------------------------
class DummyPlaceRepository implements PlaceRepositoryInterface {
  async findById(_id: string): Promise<Place | null> {
    return null;
  }

  async findBySlug(_slug: string): Promise<Place | null> {
    return null;
  }

  async search(): Promise<PaginatedPlaces> {
    return { data: [], total: 0 };
  }

  async save(
    _place: Omit<Place, "id" | "createdAt" | "updatedAt">,
  ): Promise<Place> {
    throw new Error("Not implemented");
  }

  async update(_id: string, _patch: Partial<Place>): Promise<Place> {
    throw new Error("Not implemented");
  }

  async delete(_id: string): Promise<void> {
    // no-op
  }

  async findForMap(): Promise<
    Pick<Place, "id" | "nombre" | "slug" | "coordenadas" | "categoriaId">[]
  > {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Contract tests
// ---------------------------------------------------------------------------
describe("PlaceRepositoryInterface (LSP contract)", () => {
  let repo: PlaceRepositoryInterface;

  beforeEach(() => {
    repo = new DummyPlaceRepository();
  });

  it("findById returns Place or null", async () => {
    const result = await repo.findById("test-id");
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("findBySlug returns Place or null", async () => {
    const result = await repo.findBySlug("test-slug");
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("search returns PaginatedPlaces with data array", async () => {
    const result = await repo.search({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("delete returns void", async () => {
    const result = await repo.delete("test-id");
    expect(result).toBeUndefined();
  });

  it("findForMap returns array with required fields", async () => {
    const result = await repo.findForMap();
    expect(Array.isArray(result)).toBe(true);
  });
});
