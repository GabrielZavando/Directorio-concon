/**
 * Unit tests for EventoFirestoreAdapter.
 * Mocks FirebaseService module to test domain ↔ Firestore mapping without real DB.
 */

// Mock FirebaseService before any imports that depend on it
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

import { EventoFirestoreAdapter } from "./evento-firestore.adapter";
import type { Evento } from "../domain/evento.entity";

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
    getFieldValue: jest.fn(() => ({
      delete: () => ({ __deleteSentinel: true }),
    })),
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
    ubicacion: {
      nombreLugar: undefined,
      direccion: "Av. Borgoño 1234, Concón",
      coordenadas: { lat: -32.998, lng: -71.518 },
    },
    fechaInicio: { toDate: () => new Date("2026-08-15T10:00:00Z") },
    fechaFin: { toDate: () => new Date("2026-08-17T22:00:00Z") },
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "todos"],
    nivelRuido: "alto",
    estado: "programado",
    destacado: false,
    estadoVerificacion: "verificado",
    activo: true,
    usuarioId: "user-1",
    vistasTotales: 0,
    cambios: [],
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
      expect(result!.ubicacion.coordenadas).toEqual({
        lat: -32.998,
        lng: -71.518,
      });
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

  describe("create", () => {
    it("creates a document and returns Evento with id", async () => {
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
        nombre: "Feria Gastronómica de Concón",
        slug: "feria-gastronomica-de-concon",
        descripcionCorta: "La mejor feria gastronómica del año",
        descripcion: "Disfruta de la mejor gastronomía.",
        categoriaId: "eventos",
        subcategoriaId: "ferias-gastronomicas",
        barrioId: "centro",
        organizador: "Municipalidad de Concón",
        modalidad: "presencial" as const,
        ubicacion: {
          direccion: "Av. Borgoño 1234",
          coordenadas: { lat: -32.998, lng: -71.518 },
        },
        fechaInicio: new Date("2026-08-15T10:00:00Z"),
        fechaFin: new Date("2026-08-17T22:00:00Z"),
        precioTipo: "gratis" as const,
        precioValor: 0,
        precioMoneda: "CLP" as const,
        publicoObjetivo: ["familia", "todos"] as Evento["publicoObjetivo"],
        nivelRuido: "alto" as const,
        estado: "programado" as const,
        destacado: false,
        estadoVerificacion: "pendiente" as const,
        activo: true,
        usuarioId: "user-1",
        vistasTotales: 0,
        cambios: [],
      };

      const result = await adapter.create(input);

      expect(result.id).toBe("new-evento");
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "eventos",
        expect.objectContaining({ nombre: "Feria Gastronómica de Concón" }),
      );
    });
  });

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

  describe("listMapData", () => {
    it("returns active eventos with lightweight marker fields (excludes online sin coordenadas)", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        docs: [
          {
            id: "e1",
            // presencial (default) con coordenadas → included
            data: () => ({
              nombre: "Evento 1",
              slug: "evento-1",
              subcategoriaId: "ferias-gastronomicas",
              barrioId: "centro",
              ubicacion: {
                direccion: "X",
                coordenadas: { lat: -33.0, lng: -71.5 },
              },
              fechaInicio: { toDate: () => new Date("2026-08-15") },
            }),
          },
          {
            id: "e2",
            // online sin ubicacion → excluded (no coordenadas)
            data: () => ({
              nombre: "Evento Online",
              slug: "evento-online",
              subcategoriaId: "ferias-gastronomicas",
              barrioId: "centro",
              modalidad: "online",
              fechaInicio: { toDate: () => new Date("2026-08-16") },
            }),
          },
          {
            id: "e3",
            // hibrido con coordenadas → included
            data: () => ({
              nombre: "Evento Hibrido",
              slug: "evento-hibrido",
              subcategoriaId: "ferias-gastronomicas",
              barrioId: "centro",
              modalidad: "hibrido",
              ubicacion: {
                coordenadas: { lat: -32.9, lng: -71.5 },
              },
              fechaInicio: { toDate: () => new Date("2026-08-17") },
            }),
          },
        ],
      });

      const result = await adapter.listMapData();

      // e2 (online) is excluded; e1 and e3 remain
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(["e1", "e3"]);
      expect(result[0].coordenadas).toEqual({ lat: -33.0, lng: -71.5 });
      expect(result[1].coordenadas).toEqual({ lat: -32.9, lng: -71.5 });
      expect(result[0].subcategoriaId).toBe("ferias-gastronomicas");
      expect(result[0].barrioId).toBe("centro");
    });
  });

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

    it("clears ubicacion (FieldValue.delete) when patch sets ubicacion null", async () => {
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
            ubicacion: undefined,
          }),
        });
      mockFirebase.updateDocument.mockResolvedValue(undefined);

      await adapter.update("evento-1", {
        ubicacion: null,
      } as never);

      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "eventos",
        "evento-1",
        expect.objectContaining({
          ubicacion: { __deleteSentinel: true },
        }),
      );
    });
  });

  describe("modalidad hydration (legacy retrocompat)", () => {
    it("hydrates a legacy document without modalidad as 'presencial'", async () => {
      const { modalidad, ...legacy } = makeFirestoreDoc() as Record<
        string,
        unknown
      >;
      void modalidad;
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "evento-legacy",
        data: () => legacy,
      });

      const result = await adapter.findById("evento-legacy");

      expect(result).not.toBeNull();
      expect(result!.modalidad).toBe("presencial");
    });

    it("hydrates an online document without ubicacion as ubicacion undefined", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "evento-online",
        data: () => ({
          ...makeFirestoreDoc(),
          modalidad: "online",
          ubicacion: undefined,
        }),
      });

      const result = await adapter.findById("evento-online");

      expect(result).not.toBeNull();
      expect(result!.modalidad).toBe("online");
      expect(result!.ubicacion).toBeUndefined();
    });

    it("persists modalidad on create", async () => {
      mockFirebase.getCurrentTimestamp.mockReturnValue({
        toDate: () => new Date("2026-06-01"),
      });
      mockFirebase.createDocument.mockResolvedValue({ id: "new-evento" });
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "new-evento",
        data: () => makeFirestoreDoc({ modalidad: "online" }),
      });

      const input = {
        nombre: "Webinar Online",
        slug: "webinar-online",
        descripcionCorta: "Corta",
        descripcion: "Descripción de prueba para el webinar online.",
        categoriaId: "eventos",
        subcategoriaId: "ferias-gastronomicas",
        barrioId: "centro",
        organizador: "Org",
        modalidad: "online" as const,
        fechaInicio: new Date("2026-08-15T10:00:00Z"),
        fechaFin: new Date("2026-08-17T22:00:00Z"),
        precioTipo: "gratis" as const,
        precioValor: 0,
        precioMoneda: "CLP" as const,
        publicoObjetivo: ["todos"] as Evento["publicoObjetivo"],
        nivelRuido: "bajo" as const,
        estado: "programado" as const,
        destacado: false,
        estadoVerificacion: "pendiente" as const,
        activo: true,
        usuarioId: "user-1",
        vistasTotales: 0,
        cambios: [],
      };

      await adapter.create(input);

      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "eventos",
        expect.objectContaining({ modalidad: "online" }),
      );
    });
  });

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

    it("returns paginated active eventos only (no forced verificado)", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findAllPublic({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("evento-1");
      expect(mockQuery.where).toHaveBeenCalledWith("activo", "==", true);
      // estadoVerificacion must NOT be forced when not provided
      const verificacionCalls = (
        mockQuery.where as jest.Mock
      ).mock.calls.filter((c: unknown[]) => c[0] === "estadoVerificacion");
      expect(verificacionCalls.length).toBe(0);
    });

    it("applies estadoVerificacion filter when provided (admin queue)", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllPublic({
        page: 1,
        limit: 20,
        estadoVerificacion: "pendiente",
      });

      expect(mockQuery.where).toHaveBeenCalledWith(
        "estadoVerificacion",
        "==",
        "pendiente",
      );
    });

    it("filters by fechaDesde / fechaHasta", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllPublic({
        page: 1,
        limit: 20,
        fechaDesde: "2026-08-01T00:00:00Z",
        fechaHasta: "2026-08-31T23:59:59Z",
      });

      expect(mockQuery.where).toHaveBeenCalledWith(
        "fechaInicio",
        ">=",
        new Date("2026-08-01T00:00:00Z"),
      );
      expect(mockQuery.where).toHaveBeenCalledWith(
        "fechaInicio",
        "<=",
        new Date("2026-08-31T23:59:59Z"),
      );
    });

    it("filters by destacado", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllPublic({ page: 1, limit: 20, destacado: true });

      expect(mockQuery.where).toHaveBeenCalledWith("destacado", "==", true);
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

      await adapter.findAllPublic({ page: 1, limit: 20, barrioId: "bosques" });

      expect(mockQuery.where).toHaveBeenCalledWith("barrioId", "==", "bosques");
    });

    it("filters by precioTipo", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAllPublic({ page: 1, limit: 20, precioTipo: "gratis" });

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

      await adapter.findAllPublic({ page: 1, limit: 20, estado: "programado" });

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

      expect(mockQuery.startAfter).toHaveBeenCalled();
    });
  });

  describe("findAllAdmin", () => {
    function makeQueryMock() {
      return {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "e1",
              data: () =>
                makeFirestoreDoc({ estadoVerificacion: "verificado" }),
            },
            {
              id: "e2",
              data: () => makeFirestoreDoc({ estadoVerificacion: "pendiente" }),
            },
          ],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
    }

    it("returns all eventos regardless of estadoVerificacion", async () => {
      const mockQuery = makeQueryMock();
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findAllAdmin({ page: 1, limit: 50 });

      expect(result.data).toHaveLength(2);
      const statusCalls = (mockQuery.where as jest.Mock).mock.calls.filter(
        (c: unknown[]) => c[0] === "status",
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

      await adapter.findAllAdmin({ page: 1, limit: 20, estado: "programado" });

      expect(mockQuery.where).toHaveBeenCalledWith(
        "estado",
        "==",
        "programado",
      );
    });

    it("handles cursor-based pagination for admin page > 1", async () => {
      const mockQuery = makeQueryMock();
      const mockCursorSnapshot = {
        empty: false,
        docs: [{ id: "cursor-doc" }, { id: "cursor-last" }],
      };
      mockQuery.get
        .mockResolvedValueOnce(mockCursorSnapshot as never)
        .mockResolvedValueOnce({
          docs: [
            { id: "e1", data: () => makeFirestoreDoc() },
            { id: "e2", data: () => makeFirestoreDoc() },
          ],
        } as never);
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findAllAdmin({ page: 2, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(mockQuery.startAfter).toHaveBeenCalled();
    });
  });

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
        modalidad: "presencial" as const,
        ubicacion: {
          direccion: "Dir",
          coordenadas: { lat: -33, lng: -71 },
        },
        fechaInicio: new Date("2026-08-15T10:00:00Z"),
        fechaFin: new Date("2026-08-17T22:00:00Z"),
        precioTipo: "gratis" as const,
        precioValor: 0,
        precioMoneda: "CLP" as const,
        publicoObjetivo: ["familia"] as Evento["publicoObjetivo"],
        nivelRuido: "bajo" as const,
        estado: "programado" as const,
        destacado: false,
        estadoVerificacion: "pendiente" as const,
        activo: true,
        usuarioId: "user-1",
        vistasTotales: 0,
        cambios: [],
      };

      await adapter.create(input);

      expect(mockFirebase.dateToTimestamp).toHaveBeenCalledWith(
        input.fechaInicio,
      );
      expect(mockFirebase.dateToTimestamp).toHaveBeenCalledWith(input.fechaFin);
    });
  });
});
