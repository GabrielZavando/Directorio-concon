/**
 * Write operations for CategoriaFirestoreAdapter.
 * Imports helpers from `categoria-firestore.adapter.spec-helpers.ts`.
 */
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Subcategoria } from "../domain/subcategoria.vo";
import { CategoriaFirestoreAdapter } from "./categoria-firestore.adapter";
import {
  createMockFirebase,
  makeCatEntity,
  makeFirestoreDoc,
  mockTransaction,
} from "./categoria-firestore.adapter.spec-helpers";

describe("CategoriaFirestoreAdapter - write operations", () => {
  let adapter: CategoriaFirestoreAdapter;
  let mockFirebase: ReturnType<typeof createMockFirebase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    adapter = new CategoriaFirestoreAdapter(mockFirebase as never);
  });

  describe("create", () => {
    it("throws ConflictException on duplicate slug", async () => {
      mockFirebase.getDocuments.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "gastronomia", data: () => makeFirestoreDoc() }],
      });
      const cat = makeCatEntity();
      await expect(adapter.create(cat)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("throws ConflictException on duplicate orden", async () => {
      mockFirebase.getDocuments
        .mockResolvedValueOnce({ empty: true, docs: [] })
        .mockResolvedValueOnce({
          empty: false,
          docs: [{ id: "otra", data: () => makeFirestoreDoc({ slug: "x" }) }],
        });
      await expect(adapter.create(makeCatEntity())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("creates doc and returns stored entity", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });
      mockFirebase.createDocument.mockResolvedValue(undefined);
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "gastronomia",
        data: () => makeFirestoreDoc(),
      });
      const result = await adapter.create(
        makeCatEntity({
          subcategorias: [
            { slug: "restaurantes", nombre: "Restaurantes", activo: true },
          ],
        }),
      );
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "categorias",
        expect.objectContaining({ slug: "gastronomia" }),
        "gastronomia",
      );
      expect(result.id).toBe("gastronomia");
    });

    it("throws when doc disappears after create", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });
      mockFirebase.createDocument.mockResolvedValue(undefined);
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        data: () => undefined,
        id: "gastronomia",
      });
      await expect(adapter.create(makeCatEntity())).rejects.toThrow(
        "disappeared post-create",
      );
    });
  });

  describe("updateById", () => {
    it("throws NotFoundException when doc missing", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        data: () => undefined,
        id: "x",
      });
      await expect(
        adapter.updateById("x", { nombre: "Nuevo" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("updates and returns entity", async () => {
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => makeFirestoreDoc(),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => makeFirestoreDoc({ nombre: "Nuevo" }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      const result = await adapter.updateById("gastronomia", {
        nombre: "Nuevo",
      });
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "categorias",
        "gastronomia",
        { nombre: "Nuevo" },
      );
      expect(result.nombre).toBe("Nuevo");
    });

    it("throws ConflictException when new orden is taken", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "gastronomia",
        data: () => makeFirestoreDoc(),
      });
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "otra", data: () => makeFirestoreDoc({ slug: "x" }) }],
      });
      await expect(
        adapter.updateById("gastronomia", { orden: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("updates optional fields incl. descripcion", async () => {
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => makeFirestoreDoc(),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => makeFirestoreDoc({ descripcion: "Nueva desc" }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      const result = await adapter.updateById("gastronomia", {
        descripcion: "Nueva desc",
      });
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "categorias",
        "gastronomia",
        { descripcion: "Nueva desc" },
      );
      expect(result.descripcion).toBe("Nueva desc");
    });
  });

  describe("activate / deactivate", () => {
    it("activate toggles activo true", async () => {
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => makeFirestoreDoc(),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => makeFirestoreDoc({ activo: true }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      const result = await adapter.activate("gastronomia");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "categorias",
        "gastronomia",
        { activo: true },
      );
      expect(result.activo).toBe(true);
    });

    it("deactivate toggles activo false", async () => {
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => makeFirestoreDoc(),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "gastronomia",
          data: () => makeFirestoreDoc({ activo: false }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      const result = await adapter.deactivate("gastronomia");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "categorias",
        "gastronomia",
        { activo: false },
      );
      expect(result.activo).toBe(false);
    });

    it("throws NotFoundException when missing on activate/deactivate", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        data: () => undefined,
        id: "x",
      });
      await expect(adapter.activate("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(adapter.deactivate("x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("addSubcategoria (transaction)", () => {
    it("throws NotFoundException when categoria missing", async () => {
      mockTransaction(mockFirebase, undefined);
      await expect(
        adapter.addSubcategoria(
          "x",
          new Subcategoria({ slug: "s", nombre: "S" }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ConflictException on duplicate subcategoria", async () => {
      mockTransaction(mockFirebase, makeFirestoreDoc());
      await expect(
        adapter.addSubcategoria(
          "gastronomia",
          new Subcategoria({ slug: "restaurantes", nombre: "Restaurantes" }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("appends subcategoria and returns updated entity", async () => {
      const txUpdate = mockTransaction(mockFirebase, makeFirestoreDoc());
      const result = await adapter.addSubcategoria(
        "gastronomia",
        new Subcategoria({ slug: "panaderias", nombre: "Panaderías" }),
      );
      expect(txUpdate).toHaveBeenCalled();
      expect(result.subcategorias).toHaveLength(2);
    });
  });

  describe("setSubcategoriaActivo (transaction)", () => {
    it("throws NotFoundException when categoria missing", async () => {
      mockTransaction(mockFirebase, undefined);
      await expect(
        adapter.setSubcategoriaActivo("x", "a", false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFoundException when subcategoria missing", async () => {
      mockTransaction(mockFirebase, makeFirestoreDoc({ subcategorias: [] }));
      await expect(
        adapter.setSubcategoriaActivo("gastronomia", "nope", false),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("toggles activo preserving other subs", async () => {
      mockTransaction(
        mockFirebase,
        makeFirestoreDoc({
          subcategorias: [
            { slug: "a", nombre: "A", activo: true },
            { slug: "b", nombre: "B", activo: true },
          ],
        }),
      );
      const result = await adapter.setSubcategoriaActivo(
        "gastronomia",
        "a",
        false,
      );
      expect(result.subcategorias.find((s) => s.slug === "a")?.activo).toBe(
        false,
      );
      expect(result.subcategorias.find((s) => s.slug === "b")?.activo).toBe(
        true,
      );
    });
  });
});
