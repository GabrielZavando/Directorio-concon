/**
 * Integration tests for Eventos module — complete flows through adapter + service layer.
 *
 * Tests the full pipeline: Service → Validator → Adapter (mock Firebase).
 * Uses direct instantiation (not Nest DI) to avoid module resolution issues.
 */

// Mock FirebaseService before any imports
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn(),
}));

import { EventosService } from "../application/eventos.service";
import { EventoValidator } from "../application/evento-validator";
import { EventoFirestoreAdapter } from "./evento-firestore.adapter";
import { SolicitudesService } from "../../solicitudes/application/solicitudes.service";
import { SolicitudesFirestoreAdapter } from "../../solicitudes/infrastructure/solicitudes-firestore.adapter";
import { EventoApprovalHandlerImpl } from "../application/evento-approval.handler";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";

// ---------------------------------------------------------------------------
// Mock Firebase factory
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
    ubicacionDireccion: "Av. Borgoño 1234",
    coordenadas: { lat: -32.998, lng: -71.518 },
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
    status: "pendiente",
    estado: "borrador",
    destacado: false,
    verificado: false,
    usuarioId: "user-abc",
    vistasTotales: 0,
    createdAt: { toDate: () => new Date("2026-06-01") },
    updatedAt: { toDate: () => new Date("2026-06-01") },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------
describe("Eventos Integration (Service → Adapter)", () => {
  let eventoAdapter: EventoFirestoreAdapter;
  let solicitudAdapter: SolicitudesFirestoreAdapter;
  let eventoValidator: EventoValidator;
  let solicitudService: SolicitudesService;
  let eventoHandler: EventoApprovalHandlerImpl;
  let eventosService: EventosService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();

    // Instantiate adapters and services directly
    eventoAdapter = new EventoFirestoreAdapter(mockFirebase as never);
    solicitudAdapter = new SolicitudesFirestoreAdapter(mockFirebase as never);
    eventoValidator = new EventoValidator(mockFirebase as never);
    solicitudService = new SolicitudesService(
      solicitudAdapter as never,
      undefined,
      undefined,
    );
    eventoHandler = new EventoApprovalHandlerImpl(eventoAdapter as never);
    eventosService = new EventosService(
      eventoAdapter as never,
      solicitudService as never,
      eventoValidator,
    );
  });

  // =========================================================================
  // Flow 1: Create → solicitud → approve → visible
  // =========================================================================
  describe("Flow 1: Create → solicitud → approve → visible", () => {
    it("completes full evento registration and approval", async () => {
      // ---- Step 1: Create evento ----
      // Mock getDocuments for findBySlug (adapter uses getDocuments, not getFirestore)
      mockFirebase.getDocuments.mockResolvedValue({
        empty: true,
        docs: [],
      } as never);

      // Mock createDocument (for both evento and solicitud)
      mockFirebase.createDocument
        .mockResolvedValueOnce({ id: "evento-1" })
        .mockResolvedValueOnce({ id: "sol-1" });

      // Mock getDocument — multiple calls via implementation
      mockFirebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "eventos") {
            if (id === "evento-1") {
              return Promise.resolve({
                exists: true,
                id: "evento-1",
                data: () =>
                  makeEventoFirestoreDoc({
                    status: "pendiente",
                    estado: "borrador",
                  }),
              });
            }
            // Slug check (no ID, any non-matching)
            return Promise.resolve({
              exists: false,
              id: "",
              data: () => null,
            });
          }
          if (collection === "solicitudes") {
            return Promise.resolve({
              exists: true,
              id: "sol-1",
              data: () => ({
                eventoId: "evento-1",
                usuarioId: "user-abc",
                tipo: "registro-evento",
                status: "pendiente",
                createdAt: { toDate: () => new Date("2026-06-01") },
              }),
            });
          }
          return Promise.resolve({
            exists: false,
            id,
            data: () => null,
          });
        },
      );

      const evento = await eventosService.create(
        {
          nombre: "Feria Gastronómica",
          descripcionCorta: "Degustación de platos típicos",
          descripcion:
            "Una feria con más de 30 stands de comida típica de la región.",
          subcategoriaId: "ferias-gastronomicas",
          barrioId: "centro",
          organizador: "Municipalidad de Concón",
          ubicacionDireccion: "Av. Borgoño 1234",
          coordenadas: { lat: -32.998, lng: -71.518 },
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
      expect(evento.status).toBe("pendiente");

      // ---- Step 2: Evento NOT visible publicly (status: pendiente) ----
      jest.clearAllMocks();
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "evento-1",
        data: () =>
          makeEventoFirestoreDoc({ status: "pendiente", estado: "borrador" }),
      });

      await expect(eventosService.findOnePublic("evento-1")).rejects.toThrow(
        NotFoundException,
      );

      // ---- Step 3: Admin approves via evento handler ----
      jest.clearAllMocks();
      mockFirebase.updateDocument.mockResolvedValue(undefined);
      mockFirebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "eventos" && id === "evento-1") {
            // First call before update, second after update
            const beforeUpdate =
              mockFirebase.updateDocument.mock.calls.length === 0;
            return Promise.resolve({
              exists: true,
              id: "evento-1",
              data: () =>
                makeEventoFirestoreDoc(
                  beforeUpdate
                    ? { status: "pendiente", estado: "borrador" }
                    : { status: "aprobado", estado: "programado" },
                ),
            });
          }
          return Promise.resolve({
            exists: false,
            id,
            data: () => null,
          });
        },
      );

      await eventoHandler.approveRegistro("evento-1", "admin-1");

      // ---- Step 4: Evento IS visible publicly ----
      jest.clearAllMocks();
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "evento-1",
        data: () =>
          makeEventoFirestoreDoc({
            status: "aprobado",
            estado: "programado",
          }),
      });

      const publicEvento = await eventosService.findOnePublic("evento-1");
      expect(publicEvento.status).toBe("aprobado");
    });
  });

  // =========================================================================
  // Flow 2: Update approved evento → solicitud → admin approves → applied
  // =========================================================================
  describe("Flow 2: Update approved → solicitud → approve → applied", () => {
    it("stages update for approved evento, applies proposal on approval", async () => {
      jest.clearAllMocks();

      // ---- Step 1: Update an approved evento ----
      // Setup: findById returns the existing approved evento
      mockFirebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "eventos" && id === "evento-1") {
            return Promise.resolve({
              exists: true,
              id: "evento-1",
              data: () =>
                makeEventoFirestoreDoc({
                  status: "aprobado",
                  estado: "programado",
                }),
            });
          }
          if (collection === "solicitudes" && id === "sol-2") {
            return Promise.resolve({
              exists: true,
              id: "sol-2",
              data: () => ({
                eventoId: "evento-1",
                usuarioId: "user-abc",
                tipo: "actualizacion-evento",
                status: "pendiente",
                proposal: { organizador: "Nuevo Organizador" },
                createdAt: { toDate: () => new Date("2026-06-01") },
                updatedAt: { toDate: () => new Date("2026-06-01") },
              }),
            });
          }
          return Promise.resolve({
            exists: false,
            id,
            data: () => null,
          });
        },
      );

      mockFirebase.createDocument.mockResolvedValue({ id: "sol-2" });

      const result = await eventosService.update(
        "evento-1",
        { organizador: "Nuevo Organizador" },
        "user-abc",
        "empresa",
      );

      // Verify solicitud was created (not in-place update)
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "solicitudes",
        expect.objectContaining({
          tipo: "actualizacion-evento",
          proposal: { organizador: "Nuevo Organizador" },
        }),
      );

      // The evento should NOT be modified (the update is staged)
      expect(result.status).toBe("aprobado");

      // ---- Step 2: Admin approves the solicitud ----
      jest.clearAllMocks();

      // Use mockImplementation for clarity
      mockFirebase.getDocument.mockImplementation(
        (collection: string, id: string) => {
          if (collection === "solicitudes" && id === "sol-2") {
            return Promise.resolve({
              exists: true,
              id: "sol-2",
              data: () => ({
                eventoId: "evento-1",
                tipo: "actualizacion-evento",
                status: "pendiente",
                proposal: { organizador: "Nuevo Organizador" },
                usuarioId: "user-abc",
                createdAt: { toDate: () => new Date("2026-06-01") },
              }),
            });
          }
          if (collection === "eventos" && id === "evento-1") {
            // Before update
            if (mockFirebase.updateDocument.mock.calls.length === 0) {
              return Promise.resolve({
                exists: true,
                id: "evento-1",
                data: () =>
                  makeEventoFirestoreDoc({
                    status: "aprobado",
                    estado: "programado",
                  }),
              });
            }
            // After update
            return Promise.resolve({
              exists: true,
              id: "evento-1",
              data: () =>
                makeEventoFirestoreDoc({
                  status: "aprobado",
                  estado: "programado",
                  organizador: "Nuevo Organizador",
                }),
            });
          }
          return Promise.resolve({
            exists: false,
            id,
            data: () => null,
          });
        },
      );

      mockFirebase.updateDocument.mockResolvedValue(undefined);

      await eventoHandler.applyProposal("evento-1", {
        organizador: "Nuevo Organizador",
      });

      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "eventos",
        "evento-1",
        expect.objectContaining({ organizador: "Nuevo Organizador" }),
      );
    });
  });

  // =========================================================================
  // Flow 3: Places regression — solicitud handles both types
  // =========================================================================
  describe("Flow 3: Solicitud handles both placeId and eventoId", () => {
    it("creates solicitud for place (regression)", async () => {
      jest.clearAllMocks();
      mockFirebase.createDocument.mockResolvedValue({ id: "sol-place" });
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "sol-place",
        data: () => ({
          placeId: "place-1",
          usuarioId: "user-abc",
          tipo: "registro",
          status: "pendiente",
          createdAt: { toDate: () => new Date("2026-06-01") },
        }),
      });

      const result = await solicitudAdapter.create({
        placeId: "place-1",
        usuarioId: "user-abc",
        tipo: "registro",
        status: "pendiente",
        createdAt: new Date("2026-06-01"),
      });

      expect(result.id).toBe("sol-place");
      expect(result.placeId).toBe("place-1");
      expect(result.tipo).toBe("registro");
    });

    it("creates solicitud for evento", async () => {
      jest.clearAllMocks();
      mockFirebase.createDocument.mockResolvedValue({ id: "sol-evento" });
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "sol-evento",
        data: () => ({
          eventoId: "evento-1",
          usuarioId: "user-abc",
          tipo: "registro-evento",
          status: "pendiente",
          createdAt: { toDate: () => new Date("2026-06-01") },
        }),
      });

      const result = await solicitudAdapter.create({
        eventoId: "evento-1",
        usuarioId: "user-abc",
        tipo: "registro-evento",
        status: "pendiente",
        createdAt: new Date("2026-06-01"),
      });

      expect(result.id).toBe("sol-evento");
      expect(result.eventoId).toBe("evento-1");
      expect(result.tipo).toBe("registro-evento");
    });
  });

  // =========================================================================
  // Flow 4: Public list only shows approved
  // =========================================================================
  describe("Flow 4: Public list visibility", () => {
    it("findAllPublic returns only approved eventos", async () => {
      jest.clearAllMocks();

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "e1",
              data: () => makeEventoFirestoreDoc({ status: "aprobado" }),
            },
          ],
        }),
        startAfter: jest.fn().mockReturnThis(),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await eventosService.findAllPublic({
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe("aprobado");
      expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "aprobado");
    });
  });

  // =========================================================================
  // Flow 5: 403 on delete with pending solicitudes
  // =========================================================================
  describe("Flow 5: Authorization and conflict errors", () => {
    it("returns 403 when non-owner tries to update", async () => {
      jest.clearAllMocks();
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "evento-1",
        data: () =>
          makeEventoFirestoreDoc({
            status: "pendiente",
            usuarioId: "other-user",
          }),
      });

      await expect(
        eventosService.update(
          "evento-1",
          { nombre: "Hacked" },
          "user-abc",
          "empresa",
        ),
      ).rejects.toThrow(ForbiddenException);
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
});
