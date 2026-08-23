/**
 * Unit tests for BarrioFirestoreAdapter.
 * Mocks FirebaseService to test domain ↔ Firestore mapping without a real DB.
 */

// Mock FirebaseService before any imports that depend on it
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

import { ConflictException, NotFoundException } from "@nestjs/common";
import { BarrioFirestoreAdapter } from "./barrio-firestore.adapter";
import { Barrio } from "../domain/barrio.entity";

function createMockFirebase() {
  return {
    getDocument: jest.fn(),
    getDocuments: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    dateToTimestamp: jest.fn((d: Date) => ({ toDate: () => d })),
    timestampToDate: jest.fn((t: unknown) => {
      if (t && typeof t === "object" && "toDate" in t) {
        return (t as { toDate: () => Date }).toDate();
      }
      return null;
    }),
  };
}

function makeFirestoreDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "higuerillas",
    nombre: "Higuerillas",
    slug: "higuerillas",
    tipo: "urbano",
    activo: true,
    createdAt: { toDate: () => new Date("2026-01-01") },
    updatedAt: { toDate: () => new Date("2026-01-01") },
    ...overrides,
  };
}

describe("BarrioFirestoreAdapter", () => {
  let adapter: BarrioFirestoreAdapter;
  let mockFirebase: ReturnType<typeof createMockFirebase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    adapter = new BarrioFirestoreAdapter(mockFirebase as never);
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
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "higuerillas",
        data: () => makeFirestoreDoc(),
      });
      const result = await adapter.findById("higuerillas");
      expect(result?.slug).toBe("higuerillas");
      expect(result?.tipo).toBe("urbano");
      expect(result?.activo).toBe(true);
    });
  });

  describe("findBySlug", () => {
    it("queries with slug filter", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "higuerillas", data: () => makeFirestoreDoc() }],
      });
      const result = await adapter.findBySlug("higuerillas");
      expect(mockFirebase.getDocuments).toHaveBeenCalledWith("barrios", [
        { field: "slug", operator: "==", value: "higuerillas" },
      ]);
      expect(result?.id).toBe("higuerillas");
    });

    it("returns undefined when snapshot empty", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });
      await expect(adapter.findBySlug("nope")).resolves.toBeUndefined();
    });
  });

  describe("list", () => {
    it("applies activo filter + tipo order when onlyActive", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "higuerillas", data: () => makeFirestoreDoc() }],
      });
      await adapter.list({ onlyActive: true });
      expect(mockFirebase.getDocuments).toHaveBeenCalledWith(
        "barrios",
        [{ field: "activo", operator: "==", value: true }],
        { field: "tipo", direction: "asc" },
      );
    });

    it("maps docs to domain list", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: "a",
            data: () => makeFirestoreDoc({ slug: "a", tipo: "urbano" }),
          },
          {
            id: "b",
            data: () => makeFirestoreDoc({ slug: "b", tipo: "rural" }),
          },
        ],
      });
      const result = await adapter.list();
      expect(result).toHaveLength(2);
    });
  });

  describe("existsBySlug", () => {
    it("returns true when found", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "higuerillas", data: () => makeFirestoreDoc() }],
      });
      await expect(adapter.existsBySlug("higuerillas")).resolves.toBe(true);
    });

    it("returns false when empty", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });
      await expect(adapter.existsBySlug("nope")).resolves.toBe(false);
    });
  });

  describe("create", () => {
    it("throws ConflictException on duplicate slug", async () => {
      mockFirebase.getDocuments.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: "higuerillas", data: () => makeFirestoreDoc() }],
      });
      const barrio = new Barrio({
        id: "higuerillas",
        nombre: "Higuerillas",
        slug: "higuerillas",
        tipo: "urbano",
      });
      await expect(adapter.create(barrio)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("creates doc and returns stored entity", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });
      mockFirebase.createDocument.mockResolvedValue(undefined);
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "higuerillas",
        data: () => makeFirestoreDoc(),
      });
      const barrio = new Barrio({
        id: "higuerillas",
        nombre: "Higuerillas",
        slug: "higuerillas",
        tipo: "urbano",
      });
      const result = await adapter.create(barrio);
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "barrios",
        expect.objectContaining({ slug: "higuerillas" }),
        "higuerillas",
      );
      expect(result.id).toBe("higuerillas");
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

    it("updates only provided fields and returns entity", async () => {
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "higuerillas",
          data: () => makeFirestoreDoc(),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "higuerillas",
          data: () => makeFirestoreDoc({ nombre: "Nuevo" }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      const result = await adapter.updateById("higuerillas", {
        nombre: "Nuevo",
      });
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "barrios",
        "higuerillas",
        { nombre: "Nuevo" },
      );
      expect(result.nombre).toBe("Nuevo");
    });

    it("updates optional fields (descripcion, territorio, coordenadas, codigo)", async () => {
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "higuerillas",
          data: () => makeFirestoreDoc(),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "higuerillas",
          data: () => makeFirestoreDoc({ descripcion: "Nueva desc" }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      const result = await adapter.updateById("higuerillas", {
        descripcion: "Nueva desc",
        territorio: "Zona costera",
        coordenadas: { lat: -33.01, lng: -71.52 },
        codigo: "B-001",
      });
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "barrios",
        "higuerillas",
        {
          descripcion: "Nueva desc",
          territorio: "Zona costera",
          coordenadas: { lat: -33.01, lng: -71.52 },
          codigo: "B-001",
        },
      );
      expect(result.descripcion).toBe("Nueva desc");
    });
  });

  describe("activate / deactivate", () => {
    it("throws NotFoundException when doc missing", async () => {
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

    it("sets activo false and returns entity", async () => {
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "higuerillas",
          data: () => makeFirestoreDoc(),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "higuerillas",
          data: () => makeFirestoreDoc({ activo: false }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      const result = await adapter.deactivate("higuerillas");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "barrios",
        "higuerillas",
        { activo: false },
      );
      expect(result.activo).toBe(false);
    });

    it("sets activo true and returns entity", async () => {
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "higuerillas",
          data: () => makeFirestoreDoc(),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "higuerillas",
          data: () => makeFirestoreDoc({ activo: true }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      const result = await adapter.activate("higuerillas");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "barrios",
        "higuerillas",
        { activo: true },
      );
      expect(result.activo).toBe(true);
    });
  });
});
