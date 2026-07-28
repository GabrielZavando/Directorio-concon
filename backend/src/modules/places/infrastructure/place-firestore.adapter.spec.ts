/**
 * Unit tests for PlaceFirestoreAdapter.
 * Mocks FirebaseService module to test domain ↔ Firestore mapping without real DB.
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
    status: "aprobado",
    verificado: false,
    destacado: false,
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
        status: "pendiente" as const,
        verificado: false,
        destacado: false,
        createdAt: new Date("2025-06-01"),
        updatedAt: new Date("2025-06-01"),
      };

      const result = await adapter.save(input);

      expect(result.id).toBe("new-id");
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "places",
        expect.objectContaining({ nombre: "Restaurante El Marino" }),
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
    it("returns approved places with coordinates", async () => {
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
  });

  // -------------------------------------------------------------------------
  // search
  // -------------------------------------------------------------------------
  describe("search", () => {
    it("returns paginated results with approved status", async () => {
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
            { id: "p2", data: () => makeFirestoreDoc({ nombre: "Sushi Bar" }) },
          ],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.search({ q: "pizza", page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nombre).toBe("Pizza Place");
    });
  });
});
