/**
 * Read operations for CategoriaFirestoreAdapter.
 * Imports helpers from `categoria-firestore.adapter.spec-helpers.ts`.
 */
import { CategoriaFirestoreAdapter } from "./categoria-firestore.adapter";
import {
  createMockFirebase,
  makeFirestoreDoc,
} from "./categoria-firestore.adapter.spec-helpers";

describe("CategoriaFirestoreAdapter - read operations", () => {
  let adapter: CategoriaFirestoreAdapter;
  let mockFirebase: ReturnType<typeof createMockFirebase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    adapter = new CategoriaFirestoreAdapter(mockFirebase as never);
  });

  describe("findById", () => {
    it("returns undefined when doc does not exist", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        data: () => undefined,
        id: "x",
      });
      await expect(adapter.findById("x")).resolves.toBeUndefined();
    });

    it("maps doc to domain", async () => {
      const doc = makeFirestoreDoc();
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "gastronomia",
        data: () => doc,
      });
      const result = await adapter.findById("gastronomia");
      expect(result?.slug).toBe("gastronomia");
      expect(result?.activo).toBe(true);
      expect(result?.subcategorias).toHaveLength(1);
    });
  });

  describe("findBySlug", () => {
    it("queries with slug filter", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "gastronomia", data: () => makeFirestoreDoc() }],
      });
      const result = await adapter.findBySlug("gastronomia");
      expect(mockFirebase.getDocuments).toHaveBeenCalledWith("categorias", [
        { field: "slug", operator: "==", value: "gastronomia" },
      ]);
      expect(result?.id).toBe("gastronomia");
    });

    it("returns undefined when snapshot empty", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });
      await expect(adapter.findBySlug("nope")).resolves.toBeUndefined();
    });
  });

  describe("list", () => {
    it("applies activo filter when onlyActive", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "gastronomia", data: () => makeFirestoreDoc() }],
      });
      await adapter.list({ onlyActive: true });
      expect(mockFirebase.getDocuments).toHaveBeenCalledWith(
        "categorias",
        [{ field: "activo", operator: "==", value: true }],
        { field: "orden", direction: "asc" },
      );
    });

    it("maps docs to domain list", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [
          { id: "a", data: () => makeFirestoreDoc({ slug: "a", orden: 1 }) },
          { id: "b", data: () => makeFirestoreDoc({ slug: "b", orden: 2 }) },
        ],
      });
      const result = await adapter.list();
      expect(result).toHaveLength(2);
    });
  });

  describe("existsBySlug / existsByOrden", () => {
    it("existsBySlug delegates to findBySlug", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });
      await expect(adapter.existsBySlug("x")).resolves.toBe(false);
    });

    it("existsByOrden with excludeId returns false when only excluded doc matches", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "gastronomia", data: () => makeFirestoreDoc() }],
      });
      await expect(adapter.existsByOrden(1, "gastronomia")).resolves.toBe(
        false,
      );
      await expect(adapter.existsByOrden(1, "other")).resolves.toBe(true);
    });
  });
});
