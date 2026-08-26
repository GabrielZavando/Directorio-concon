/**
 * Unit tests for PlaceFirestoreAdapter.
 * Mocks FirebaseService module to test domain ↔ Firestore mapping without real DB.
 *
 * Updated by places-refactor (CH-03): replaced `status`/`verificado`/`fechaVerificacion`
 * with `activo`/`estadoVerificacion`/`motivoRechazoVerificacion`/`gestionadoPorAdmin`.
 */

// Mock FirebaseService before any imports that depend on it
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

import { PlaceFirestoreAdapter } from "./place-firestore.adapter";

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------
function createMockFirebase() {
  return {
    getFirestore: jest.fn(),
    getDocument: jest.fn(),
    getDocuments: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    getCurrentTimestamp: jest.fn(),
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
    nombre: "Restaurante El Marino",
    slug: "restaurante-el-marino",
    descripcionCorta: "Mariscos frescos",
    descripcion: "Restaurante familiar especializado en mariscos",
    categoriaId: "gastronomia",
    barrioId: "higuerillas",
    direccion: "Av. Borgoño 123",
    coordenadas: { lat: -33.01, lng: -71.54 },
    imagenes: { galeria: [] },
    planId: "gratuito",
    abierto24x7: false,
    vistasTotales: 0,
    activo: true,
    estadoVerificacion: "verificado",
    gestionadoPorAdmin: false,
    destacado: false,
    usuarioId: "user-1",
    createdAt: { toDate: () => new Date("2025-01-01") },
    updatedAt: { toDate: () => new Date("2025-01-01") },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PlaceFirestoreAdapter", () => {
  let adapter: PlaceFirestoreAdapter;
  let mockFirebase: ReturnType<typeof createMockFirebase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    adapter = new PlaceFirestoreAdapter(mockFirebase as never);
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe("findById", () => {
    it("returns a Place when document exists", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "place-1",
        data: () => makeFirestoreDoc(),
      });

      const result = await adapter.findById("place-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("place-1");
      expect(result!.nombre).toBe("Restaurante El Marino");
      expect(result!.activo).toBe(true);
      expect(result!.estadoVerificacion).toBe("verificado");
      expect(result!.createdAt).toBeInstanceOf(Date);
    });

    it("returns null when document does not exist", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        id: "not-found",
        data: () => undefined,
      });

      const result = await adapter.findById("not-found");
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findBySlug
  // -------------------------------------------------------------------------
  describe("findBySlug", () => {
    it("returns a Place when slug matches", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "place-1", data: () => makeFirestoreDoc() }],
      });

      const result = await adapter.findBySlug("restaurante-el-marino");

      expect(result).not.toBeNull();
      expect(result!.slug).toBe("restaurante-el-marino");
    });

    it("returns null when no slug match", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });

      const result = await adapter.findBySlug("non-existent");
      expect(result).toBeNull();
    });

    it("queries with activo=true filter", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: true,
        docs: [],
      });

      await adapter.findBySlug("some-slug");

      expect(mockFirebase.getDocuments).toHaveBeenCalledWith(
        "places",
        expect.arrayContaining([
          expect.objectContaining({
            field: "activo",
            operator: "==",
            value: true,
          }),
        ]),
        undefined,
        1,
      );
    });
  });

  // -------------------------------------------------------------------------
  // save
  // -------------------------------------------------------------------------
  describe("save", () => {
    it("creates a document and returns Place with id", async () => {
      mockFirebase.getCurrentTimestamp.mockReturnValue({
        toDate: () => new Date("2025-06-01"),
      });
      mockFirebase.createDocument.mockResolvedValue({ id: "new-id" });
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "new-id",
        data: () => makeFirestoreDoc(),
      });

      const input = {
        nombre: "Restaurante El Marino",
        slug: "restaurante-el-marino",
        descripcionCorta: "Mariscos frescos",
        descripcion: "Restaurante familiar especializado en mariscos",
        categoriaId: "gastronomia",
        barrioId: "higuerillas",
        direccion: "Av. Borgoño 123",
        coordenadas: { lat: -33.01, lng: -71.54 },
        imagenes: { galeria: [] },
        planId: "gratuito" as const,
        abierto24x7: false,
        vistasTotales: 0,
        activo: true,
        estadoVerificacion: "pendiente" as const,
        gestionadoPorAdmin: false,
        destacado: false,
        usuarioId: "user-1",
      };

      const result = await adapter.save(input);

      expect(result.id).toBe("new-id");
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "places",
        expect.objectContaining({ nombre: "Restaurante El Marino" }),
      );
    });

    it("persists activo and estadoVerificacion fields", async () => {
      mockFirebase.getCurrentTimestamp.mockReturnValue({
        toDate: () => new Date("2025-06-01"),
      });
      mockFirebase.createDocument.mockResolvedValue({ id: "new-id" });
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "new-id",
        data: () => makeFirestoreDoc(),
      });

      const input = {
        nombre: "Test",
        slug: "test",
        descripcionCorta: "d",
        descripcion: "d",
        categoriaId: "c",
        barrioId: "b",
        direccion: "a",
        coordenadas: { lat: 0, lng: 0 },
        imagenes: { galeria: [] },
        planId: "gratuito" as const,
        abierto24x7: false,
        vistasTotales: 0,
        activo: true,
        estadoVerificacion: "pendiente" as const,
        gestionadoPorAdmin: false,
        destacado: false,
        usuarioId: "user-1",
      };

      await adapter.save(input);

      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "places",
        expect.objectContaining({
          activo: true,
          estadoVerificacion: "pendiente",
          gestionadoPorAdmin: false,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe("delete", () => {
    it("delegates to firebase.deleteDocument", async () => {
      mockFirebase.deleteDocument.mockResolvedValue(undefined);

      await adapter.delete("place-1");

      expect(mockFirebase.deleteDocument).toHaveBeenCalledWith(
        "places",
        "place-1",
      );
    });
  });

  // -------------------------------------------------------------------------
  // findForMap
  // -------------------------------------------------------------------------
  describe("findForMap", () => {
    it("returns active places with coordinates", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        docs: [
          {
            id: "p1",
            data: () => ({
              nombre: "Place 1",
              slug: "place-1",
              coordenadas: { lat: -33.0, lng: -71.5 },
              categoriaId: "gastronomia",
            }),
          },
          {
            id: "p2",
            data: () => ({
              nombre: "Place 2",
              slug: "place-2",
              categoriaId: "servicios",
              // No coordenadas — should be filtered out
            }),
          },
        ],
      });

      const result = await adapter.findForMap();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("p1");
      expect(result[0].coordenadas).toEqual({ lat: -33.0, lng: -71.5 });
    });

    it("queries with activo=true filter", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ docs: [] });

      await adapter.findForMap();

      expect(mockFirebase.getDocuments).toHaveBeenCalledWith(
        "places",
        expect.arrayContaining([
          expect.objectContaining({
            field: "activo",
            operator: "==",
            value: true,
          }),
        ]),
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe("update", () => {
    it("updates document and returns updated Place", async () => {
      const existingDoc = makeFirestoreDoc();
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "place-1",
          data: () => existingDoc,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "place-1",
          data: () => ({ ...existingDoc, telefono: "+56999999999" }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);

      const result = await adapter.update("place-1", {
        telefono: "+56999999999",
      });

      expect(result.telefono).toBe("+56999999999");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "places",
        "place-1",
        expect.objectContaining({ telefono: "+56999999999" }),
      );
    });

    it("persists activo field in updates", async () => {
      const existingDoc = makeFirestoreDoc();
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "place-1",
          data: () => existingDoc,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "place-1",
          data: () => ({ ...existingDoc, activo: false }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);

      const result = await adapter.update("place-1", { activo: false });

      expect(result.activo).toBe(false);
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "places",
        "place-1",
        expect.objectContaining({ activo: false }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // search
  // -------------------------------------------------------------------------
  describe("search", () => {
    it("returns paginated results with activo=true default", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [{ id: "place-1", data: () => makeFirestoreDoc() }],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.search({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("place-1");
      // Verify activo=true filter is applied
      expect(mockQuery.where).toHaveBeenCalledWith("activo", "==", true);
    });

    it("respects explicit activo=false filter", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.search({ activo: false, page: 1, limit: 20 });

      expect(mockQuery.where).toHaveBeenCalledWith("activo", "==", false);
    });

    it("filters by estadoVerificacion", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.search({
        activo: true,
        estadoVerificacion: "verificado",
        page: 1,
        limit: 20,
      });

      expect(mockQuery.where).toHaveBeenCalledWith(
        "estadoVerificacion",
        "==",
        "verificado",
      );
    });

    it("filters by text query (q)", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "p1",
              data: () => makeFirestoreDoc({ nombre: "Pizza Place" }),
            },
            {
              id: "p2",
              data: () => makeFirestoreDoc({ nombre: "Sushi Bar" }),
            },
          ],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.search({
        q: "pizza",
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nombre).toBe("Pizza Place");
    });
  });

  // -------------------------------------------------------------------------
  // findSinDueno
  // -------------------------------------------------------------------------
  describe("findSinDueno", () => {
    it("queries activo=true and returns paginated results", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "p1",
              data: () =>
                makeFirestoreDoc({
                  usuarioId: null,
                  gestionadoPorAdmin: false,
                }),
            },
          ],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findSinDueno();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("p1");
    });

    it("accepts pagination filters", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [] }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findSinDueno({ page: 2, limit: 5 });

      expect(result.data).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // countByUsuarioId
  // -------------------------------------------------------------------------
  describe("countByUsuarioId", () => {
    it("counts active places by usuarioId", async () => {
      const countResult = { data: () => ({ count: 3 }) };
      const countChain = {
        get: jest.fn().mockResolvedValue(countResult),
      };
      const whereChain = {
        where: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnValue(countChain),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue(whereChain),
        }),
      });

      const result = await adapter.countByUsuarioId("user-1");

      expect(result).toBe(3);
    });
  });
});
