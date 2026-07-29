/**
 * Unit tests for EventoFirestoreAdapter.
 * Mocks FirebaseService module to test domain ↔ Firestore mapping without real DB.
 */

// Mock FirebaseService before any imports that depend on it
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

import { EventoFirestoreAdapter } from "./evento-firestore.adapter";

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
    nombre: "Feria Gastronómica de Concón",
    slug: "feria-gastronomica-de-concon",
    descripcionCorta: "La mejor feria gastronómica del año",
    descripcion: "Disfruta de la mejor gastronomía local con más de 50 stands.",
    categoriaId: "eventos",
    subcategoriaId: "ferias-gastronomicas",
    barrioId: "centro",
    organizador: "Municipalidad de Concón",
    organizadorContacto: "+56912345678",
    ubicacionDireccion: "Av. Borgoño 1234, Concón",
    coordenadas: { lat: -32.998, lng: -71.518 },
    fechaInicio: { toDate: () => new Date("2026-08-15T10:00:00Z") },
    fechaFin: { toDate: () => new Date("2026-08-17T22:00:00Z") },
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "todos"],
    nivelRuido: "alto",
    status: "aprobado",
    estado: "programado",
    destacado: false,
    verificado: false,
    usuarioId: "user-1",
    vistasTotales: 0,
    createdAt: { toDate: () => new Date("2026-01-01") },
    updatedAt: { toDate: () => new Date("2026-01-01") },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("EventoFirestoreAdapter", () => {
  let adapter: EventoFirestoreAdapter;
  let mockFirebase: ReturnType<typeof createMockFirebase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    adapter = new EventoFirestoreAdapter(mockFirebase as never);
  });

  // =========================================================================
  // findById
  // =========================================================================
  describe("findById", () => {
    it("returns an Evento when document exists", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "evento-1",
        data: () => makeFirestoreDoc(),
      });

      const result = await adapter.findById("evento-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("evento-1");
      expect(result!.nombre).toBe("Feria Gastronómica de Concón");
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

  // =========================================================================
  // findBySlug
  // =========================================================================
  describe("findBySlug", () => {
    it("returns an Evento when slug matches", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "evento-1", data: () => makeFirestoreDoc() }],
      });

      const result = await adapter.findBySlug("feria-gastronomica-de-concon");

      expect(result).not.toBeNull();
      expect(result!.slug).toBe("feria-gastronomica-de-concon");
    });

    it("returns null when no slug match", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });

      const result = await adapter.findBySlug("non-existent");
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // create
  // =========================================================================
  describe("create", () => {
    it("creates a document and returns Evento with id", async () => {
      mockFirebase.getCurrentTimestamp.mockReturnValue({
        toDate: () => new Date("2026-06-01"),
      });
      mockFirebase.createDocument.mockResolvedValue({ id: "new-evento" });
      // Simulate a subsequent findById returning the created doc
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "new-evento",
        data: () => makeFirestoreDoc(),
      });

      const input = {
        nombre: "Feria Gastronómica de Concón",
        slug: "feria-gastronomica-de-concon",
        descripcionCorta: "La mejor feria gastronómica del año",
        descripcion: "Disfruta de la mejor gastronomía.",
        categoriaId: "eventos",
        subcategoriaId: "ferias-gastronomicas",
        barrioId: "centro",
        organizador: "Municipalidad de Concón",
        ubicacionDireccion: "Av. Borgoño 1234",
        coordenadas: { lat: -32.998, lng: -71.518 },
        fechaInicio: new Date("2026-08-15T10:00:00Z"),
        fechaFin: new Date("2026-08-17T22:00:00Z"),
        precioTipo: "gratis" as const,
        precioValor: 0,
        precioMoneda: "CLP" as const,
        publicoObjetivo: ["familia", "todos"] as any,
        nivelRuido: "alto" as const,
        status: "pendiente" as const,
        estado: "borrador" as const,
        destacado: false,
        verificado: false,
        usuarioId: "user-1",
        vistasTotales: 0,
      };

      const result = await adapter.create(input);

      expect(result.id).toBe("new-evento");
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "eventos",
        expect.objectContaining({ nombre: "Feria Gastronómica de Concón" }),
      );
    });
  });

  // =========================================================================
  // delete
  // =========================================================================
  describe("delete", () => {
    it("delegates to firebase.deleteDocument", async () => {
      mockFirebase.deleteDocument.mockResolvedValue(undefined);

      await adapter.delete("evento-1");

      expect(mockFirebase.deleteDocument).toHaveBeenCalledWith(
        "eventos",
        "evento-1",
      );
    });
  });

  // =========================================================================
  // listMapData
  // =========================================================================
  describe("listMapData", () => {
    it("returns approved eventos with coordinates", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        docs: [
          {
            id: "e1",
            data: () => ({
              nombre: "Evento 1",
              slug: "evento-1",
              coordenadas: { lat: -33.0, lng: -71.5 },
              categoriaId: "eventos",
              fechaInicio: { toDate: () => new Date("2026-08-15") },
            }),
          },
          {
            id: "e2",
            data: () => ({
              nombre: "Evento 2",
              slug: "evento-2",
              categoriaId: "eventos",
              fechaInicio: { toDate: () => new Date("2026-08-16") },
              // No coordenadas — should be filtered out
            }),
          },
        ],
      });

      const result = await adapter.listMapData();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("e1");
      expect(result[0].coordenadas).toEqual({ lat: -33.0, lng: -71.5 });
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe("update", () => {
    it("updates document and returns updated Evento", async () => {
      const existingDoc = makeFirestoreDoc();
      mockFirebase.getDocument
        .mockResolvedValueOnce({
          exists: true,
          id: "evento-1",
          data: () => existingDoc,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: "evento-1",
          data: () => ({
            ...existingDoc,
            descripcion: "Nueva descripción actualizada",
          }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);

      const result = await adapter.update("evento-1", {
        descripcion: "Nueva descripción actualizada",
      });

      expect(result.descripcion).toBe("Nueva descripción actualizada");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "eventos",
        "evento-1",
        expect.objectContaining({
          descripcion: "Nueva descripción actualizada",
        }),
      );
    });
  });

  // =========================================================================
  // findAllPublic
  // =========================================================================
  describe("findAllPublic", () => {
    function makeQueryMock() {
      return {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [{ id: "evento-1", data: () => makeFirestoreDoc() }],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
    }

    it("returns paginated approved eventos only", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findAllPublic({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("evento-1");
      expect(result.data[0].status).toBe("aprobado");
      // Verify query has status filter
      expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "aprobado");
    });

    it("filters by subcategoriaId", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllPublic({
        page: 1,
        limit: 20,
        subcategoriaId: "conciertos-y-shows",
      });

      expect(mockQuery.where).toHaveBeenCalledWith(
        "subcategoriaId",
        "==",
        "conciertos-y-shows",
      );
    });

    it("filters by barrioId", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllPublic({
        page: 1,
        limit: 20,
        barrioId: "bosques",
      });

      expect(mockQuery.where).toHaveBeenCalledWith("barrioId", "==", "bosques");
    });

    it("filters by precioTipo", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllPublic({
        page: 1,
        limit: 20,
        precioTipo: "gratis",
      });

      expect(mockQuery.where).toHaveBeenCalledWith(
        "precioTipo",
        "==",
        "gratis",
      );
    });

    it("filters by estado", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllPublic({
        page: 1,
        limit: 20,
        estado: "programado",
      });

      expect(mockQuery.where).toHaveBeenCalledWith(
        "estado",
        "==",
        "programado",
      );
    });

    it("applies text search filter (q)", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "e1",
              data: () => makeFirestoreDoc({ nombre: "Concierto Verano" }),
            },
            {
              id: "e2",
              data: () => makeFirestoreDoc({ nombre: "Feria de Flores" }),
            },
          ],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findAllPublic({
        q: "concierto",
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nombre).toBe("Concierto Verano");
    });

    it("handles cursor-based pagination for page > 1", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllPublic({ page: 2, limit: 10 });

      // Should call startAfter with a cursor document
      expect(mockQuery.startAfter).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // findAllAdmin
  // =========================================================================
  describe("findAllAdmin", () => {
    function makeQueryMock() {
      return {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            { id: "e1", data: () => makeFirestoreDoc({ status: "aprobado" }) },
            { id: "e2", data: () => makeFirestoreDoc({ status: "pendiente" }) },
          ],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
    }

    it("returns all eventos regardless of status", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findAllAdmin({ page: 1, limit: 50 });

      expect(result.data).toHaveLength(2);
      // Admin query should NOT filter by status="aprobado"
      const statusCalls = (mockQuery.where as jest.Mock).mock.calls.filter(
        (c: string[]) => c[0] === "status",
      );
      expect(statusCalls.length).toBe(0);
    });

    it("filters by categoriaId when provided", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllAdmin({
        page: 1,
        limit: 20,
        categoriaId: "eventos",
      });

      expect(mockQuery.where).toHaveBeenCalledWith(
        "categoriaId",
        "==",
        "eventos",
      );
    });

    it("filters by estado when provided", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllAdmin({
        page: 1,
        limit: 20,
        estado: "borrador",
      });

      expect(mockQuery.where).toHaveBeenCalledWith("estado", "==", "borrador");
    });

    it("handles cursor-based pagination for admin page > 1", async () => {
      // Override get to return cursor position doc for the offset query
      const mockQuery = makeQueryMock();
      const mockCursorSnapshot = {
        empty: false,
        docs: [{ id: "cursor-doc" }, { id: "cursor-last" }],
      };
      // First call to get() is for cursor offset, second is for data
      mockQuery.get
        .mockResolvedValueOnce(mockCursorSnapshot as any)
        .mockResolvedValueOnce({
          docs: [
            { id: "e1", data: () => makeFirestoreDoc() },
            { id: "e2", data: () => makeFirestoreDoc() },
          ],
        } as any);
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findAllAdmin({ page: 2, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(mockQuery.startAfter).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // toPersistence date conversions (create with Date fields)
  // =========================================================================
  describe("create with date fields", () => {
    it("converts Date fields to Firestore timestamps", async () => {
      mockFirebase.getCurrentTimestamp.mockReturnValue({
        toDate: () => new Date("2026-06-01"),
      });
      mockFirebase.createDocument.mockResolvedValue({ id: "new-evento" });
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "new-evento",
        data: () => makeFirestoreDoc(),
      });

      const input = {
        nombre: "Fecha Test",
        slug: "fecha-test",
        descripcionCorta: "Test",
        descripcion: "Descripción de prueba para el test de fechas.",
        categoriaId: "eventos",
        subcategoriaId: "ferias-gastronomicas",
        barrioId: "centro",
        organizador: "Org",
        ubicacionDireccion: "Dir",
        coordenadas: { lat: -33, lng: -71 },
        fechaInicio: new Date("2026-08-15T10:00:00Z"),
        fechaFin: new Date("2026-08-17T22:00:00Z"),
        precioTipo: "gratis" as const,
        precioValor: 0,
        precioMoneda: "CLP" as const,
        publicoObjetivo: ["familia"] as any,
        nivelRuido: "bajo" as const,
        status: "pendiente" as const,
        estado: "borrador" as const,
        destacado: false,
        verificado: false,
        usuarioId: "user-1",
        vistasTotales: 0,
      };

      await adapter.create(input);

      // Verify dateToTimestamp was called for fechaInicio and fechaFin
      expect(mockFirebase.dateToTimestamp).toHaveBeenCalledWith(
        input.fechaInicio,
      );
      expect(mockFirebase.dateToTimestamp).toHaveBeenCalledWith(input.fechaFin);
    });
  });
});
