/**
 * Integration tests for Eventos module — complete flows through service + adapter.
 *
 * Tests the full pipeline: Service → Validator → Adapter (mock Firebase).
 * Uses direct instantiation (not Nest DI) to avoid module resolution issues.
 */

jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn(),
}));

import { EventosService } from "../application/eventos.service";
import { EventoValidator } from "../application/evento-validator";
import { EventoFirestoreAdapter } from "./evento-firestore.adapter";
import type { CatalogValidator } from "../../categorias/application/catalog-validator.service";
import type { NotificacionesPort } from "../application/notificaciones.port";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

function createMockFirebase() {
  return {
    getFirestore: jest.fn(),
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    getCollection: jest.fn(),
    getDocuments: jest.fn(),
    getCurrentTimestamp: jest.fn(() => ({
      toDate: () => new Date("2026-06-01"),
    })),
    dateToTimestamp: jest.fn((d: Date) => ({ toDate: () => d })),
    timestampToDate: jest.fn((t: unknown) => {
      if (t && typeof t === "object" && "toDate" in t) {
        return (t as { toDate: () => Date }).toDate();
      }
      return null;
    }),
    documentExists: jest.fn().mockResolvedValue(true),
  };
}

let mockFirebase: ReturnType<typeof createMockFirebase>;

function makeEventoFirestoreDoc(overrides: Record<string, unknown> = {}) {
  return {
    nombre: "Feria Gastronómica",
    slug: "feria-gastronomica",
    descripcionCorta: "Degustación de platos típicos",
    descripcion: "Una feria con más de 30 stands de comida típica.",
    categoriaId: "eventos",
    subcategoriaId: "ferias-gastronomicas",
    barrioId: "centro",
    organizador: "Municipalidad de Concón",
    organizadorContacto: "+56912345678",
    ubicacion: {
      nombreLugar: undefined,
      direccion: "Av. Borgoño 1234",
      coordenadas: { lat: -32.998, lng: -71.518 },
    },
    fechaInicio: { toDate: () => new Date("2026-08-15T10:00:00Z") },
    fechaFin: { toDate: () => new Date("2026-08-17T22:00:00Z") },
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    capacidadMaxima: 500,
    publicoObjetivo: ["familia"],
    nivelRuido: "medio",
    portada: null,
    accesibilidad: ["acceso-silla-de-ruedas"],
    estado: "programado",
    destacado: false,
    estadoVerificacion: "pendiente",
    activo: true,
    usuarioId: "user-abc",
    vistasTotales: 0,
    cambios: [],
    createdAt: { toDate: () => new Date("2026-06-01") },
    updatedAt: { toDate: () => new Date("2026-06-01") },
    ...overrides,
  };
}

describe("Eventos Integration (Service → Adapter)", () => {
  let eventoAdapter: EventoFirestoreAdapter;
  let eventoValidator: EventoValidator;
  let notificaciones: jest.Mocked<NotificacionesPort>;
  let eventosService: EventosService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    eventoAdapter = new EventoFirestoreAdapter(mockFirebase as never);
    eventoValidator = new EventoValidator(mockFirebase as never);
    notificaciones = {
      notifyEventoRevertidoPendiente: jest.fn().mockResolvedValue(undefined),
    };
    // Catalog validation disabled in integration tests (focus on evento flow).
    eventosService = new EventosService(
      eventoAdapter as never,
      eventoValidator,
      { enabled: false } as unknown as CatalogValidator,
      notificaciones,
    );
  });

  // =========================================================================
  // Flow 1: Create → pendiente → verificar → visible
  // =========================================================================
  describe("Flow 1: Create → verificar → visible", () => {
    it("completes full evento registration and verification", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: true,
        docs: [],
      } as never);
      mockFirebase.createDocument.mockResolvedValueOnce({ id: "evento-1" });
      mockFirebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "eventos" && id === "evento-1") {
            return Promise.resolve({
              exists: true,
              id: "evento-1",
              data: () =>
                makeEventoFirestoreDoc({ estadoVerificacion: "pendiente" }),
            });
          }
          return Promise.resolve({ exists: false, id, data: () => null });
        },
      );

      const evento = await eventosService.create(
        {
          nombre: "Feria Gastronómica",
          descripcionCorta: "Degustación de platos típicos",
          descripcion: "Una feria con más de 30 stands de comida típica.",
          subcategoriaId: "ferias-gastronomicas",
          barrioId: "centro",
          organizador: "Municipalidad de Concón",
          modalidad: "presencial",
          ubicacion: {
            direccion: "Av. Borgoño 1234",
            coordenadas: { lat: -32.998, lng: -71.518 },
          },
          fechaInicio: "2026-08-15T10:00:00.000Z",
          fechaFin: "2026-08-17T22:00:00.000Z",
          precioTipo: "gratis",
          precioValor: 0,
          publicoObjetivo: ["familia"],
          nivelRuido: "medio",
        },
        "user-abc",
      );

      expect(evento.id).toBe("evento-1");
      expect(evento.estadoVerificacion).toBe("pendiente");

      // Evento IS visible publicly immediately (activo:true, any estadoVerificacion)
      jest.clearAllMocks();
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "evento-1",
        data: () => makeEventoFirestoreDoc({ estadoVerificacion: "pendiente" }),
      });

      const publicPendiente = await eventosService.findOnePublic("evento-1");
      expect(publicPendiente.estadoVerificacion).toBe("pendiente");

      // Admin verifies
      jest.clearAllMocks();
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      mockFirebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "eventos" && id === "evento-1") {
            const beforeUpdate =
              mockFirebase.updateDocument.mock.calls.length === 0;
            return Promise.resolve({
              exists: true,
              id: "evento-1",
              data: () =>
                makeEventoFirestoreDoc(
                  beforeUpdate
                    ? { estadoVerificacion: "pendiente" }
                    : { estadoVerificacion: "verificado" },
                ),
            });
          }
          return Promise.resolve({ exists: false, id, data: () => null });
        },
      );

      await eventosService.verificar("evento-1", "verificado", "admin-1");

      // Evento IS visible publicly (still activo)
      jest.clearAllMocks();
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "evento-1",
        data: () =>
          makeEventoFirestoreDoc({ estadoVerificacion: "verificado" }),
      });

      const publicEvento = await eventosService.findOnePublic("evento-1");
      expect(publicEvento.estadoVerificacion).toBe("verificado");
    });
  });

  // =========================================================================
  // Flow 2: Update verified evento → reverts to pendiente
  // =========================================================================
  describe("Flow 2: Update verified → reverts to pendiente", () => {
    it("records cambios and reverts verification", async () => {
      jest.clearAllMocks();
      mockFirebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "eventos" && id === "evento-1") {
            const calls = mockFirebase.updateDocument.mock.calls;
            const beforeUpdate = calls.length === 0;
            const patch =
              calls.length > 0 ? (calls[0][2] as Record<string, unknown>) : {};
            return Promise.resolve({
              exists: true,
              id: "evento-1",
              data: () =>
                makeEventoFirestoreDoc(
                  beforeUpdate
                    ? { estadoVerificacion: "verificado", organizador: "Viejo" }
                    : {
                        estadoVerificacion: "pendiente",
                        organizador: "Nuevo Organizador",
                        ...patch,
                      },
                ),
            });
          }
          return Promise.resolve({ exists: false, id, data: () => null });
        },
      );
      mockFirebase.updateDocument.mockResolvedValue(undefined);

      const result = await eventosService.update(
        "evento-1",
        { organizador: "Nuevo Organizador" },
        "user-abc",
        "owner",
      );

      expect(result.estadoVerificacion).toBe("pendiente");
      expect(result.cambios.length).toBeGreaterThan(0);
      expect(notificaciones.notifyEventoRevertidoPendiente).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Flow 3: Public list only shows active + verified
  // =========================================================================
  describe("Flow 3: Public list visibility", () => {
    it("findAllPublic returns only active + verified eventos", async () => {
      jest.clearAllMocks();
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "e1",
              data: () =>
                makeEventoFirestoreDoc({ estadoVerificacion: "verificado" }),
            },
          ],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await eventosService.findAllPublic({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].estadoVerificacion).toBe("verificado");
      expect(mockQuery.where).toHaveBeenCalledWith("activo", "==", true);
      // estadoVerificacion is NOT forced by default
      const verificacionCalls = (
        mockQuery.where as jest.Mock
      ).mock.calls.filter((c: unknown[]) => c[0] === "estadoVerificacion");
      expect(verificacionCalls.length).toBe(0);
    });

    it("findAllPublic applies estadoVerificacion filter when provided", async () => {
      jest.clearAllMocks();
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

      await eventosService.findAllPublic({
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
  });

  // =========================================================================
  // Flow 4: Authorization and conflict errors
  // =========================================================================
  describe("Flow 4: Authorization and conflict errors", () => {
    it("returns 403 when non-owner tries to update", async () => {
      jest.clearAllMocks();
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "evento-1",
        data: () =>
          makeEventoFirestoreDoc({
            estadoVerificacion: "pendiente",
            usuarioId: "other-user",
          }),
      });

      await expect(
        eventosService.update(
          "evento-1",
          { nombre: "Hacked" },
          "user-abc",
          "owner",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("admin can update another's evento", async () => {
      jest.clearAllMocks();
      mockFirebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "eventos" && id === "evento-1") {
            const beforeUpdate =
              mockFirebase.updateDocument.mock.calls.length === 0;
            return Promise.resolve({
              exists: true,
              id: "evento-1",
              data: () =>
                makeEventoFirestoreDoc({
                  estadoVerificacion: "pendiente",
                  usuarioId: "other-user",
                  ...(beforeUpdate ? {} : { organizador: "Nuevo Organizador" }),
                }),
            });
          }
          return Promise.resolve({ exists: false, id, data: () => null });
        },
      );
      mockFirebase.updateDocument.mockResolvedValue(undefined);

      const result = await eventosService.update(
        "evento-1",
        { organizador: "Nuevo Organizador" },
        "admin-1",
        "admin",
      );

      expect(result.organizador).toBe("Nuevo Organizador");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "eventos",
        "evento-1",
        expect.objectContaining({ organizador: "Nuevo Organizador" }),
      );
    });

    it("returns 404 for non-existent evento", async () => {
      jest.clearAllMocks();
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        id: "no-existe",
        data: () => null,
      });

      await expect(eventosService.findOnePublic("no-existe")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // Flow 5: Soft delete
  // =========================================================================
  describe("Flow 5: Soft delete", () => {
    it("marks evento inactive instead of removing it", async () => {
      jest.clearAllMocks();
      mockFirebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "eventos" && id === "evento-1") {
            const beforeUpdate =
              mockFirebase.updateDocument.mock.calls.length === 0;
            return Promise.resolve({
              exists: true,
              id: "evento-1",
              data: () =>
                makeEventoFirestoreDoc(
                  beforeUpdate ? { activo: true } : { activo: false },
                ),
            });
          }
          return Promise.resolve({ exists: false, id, data: () => null });
        },
      );
      mockFirebase.updateDocument.mockResolvedValue(undefined);

      const result = await eventosService.remove(
        "evento-1",
        "user-abc",
        "owner",
      );

      expect(result.activo).toBe(false);
      expect(mockFirebase.deleteDocument).not.toHaveBeenCalled();
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "eventos",
        "evento-1",
        expect.objectContaining({ activo: false }),
      );
    });
  });
});
