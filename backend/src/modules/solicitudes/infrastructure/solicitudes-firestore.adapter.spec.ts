/**
 * Unit tests for SolicitudesFirestoreAdapter.
 * Mocks FirebaseService directly without Nest DI to avoid module resolution issues.
 */

// Mock FirebaseService before any imports
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn(),
}));

import { SolicitudesFirestoreAdapter } from "./solicitudes-firestore.adapter";

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------
function createMockFirebase() {
  return {
    getFirestore: jest.fn(),
    getDocument: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    getCurrentTimestamp: jest.fn(),
    dateToTimestamp: jest.fn((d: Date) => ({ toDate: () => d })),
  };
}

let mockFirebase: ReturnType<typeof createMockFirebase>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSolicitudDoc(overrides: Record<string, unknown> = {}) {
  return {
    placeId: "place-1",
    eventoId: null,
    usuarioId: "user-abc",
    tipo: "registro",
    status: "pendiente",
    proposal: null,
    comentarios: null,
    revisadoPor: null,
    createdAt: { toDate: () => new Date("2026-01-01") },
    revisadoAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SolicitudesFirestoreAdapter", () => {
  let adapter: SolicitudesFirestoreAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    adapter = new SolicitudesFirestoreAdapter(mockFirebase as never);
  });

  // =========================================================================
  // create
  // =========================================================================
  describe("create", () => {
    it("creates a solicitud document and returns it", async () => {
      mockFirebase.createDocument.mockResolvedValue({ id: "sol-1" });
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "sol-1",
        data: () => makeSolicitudDoc(),
      });
      mockFirebase.getCurrentTimestamp.mockReturnValue({
        toDate: () => new Date("2026-01-01"),
      });

      const result = await adapter.create({
        placeId: "place-1",
        usuarioId: "user-abc",
        tipo: "registro",
        status: "pendiente",
        createdAt: new Date("2026-01-01"),
      });

      expect(result.id).toBe("sol-1");
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "solicitudes",
        expect.objectContaining({ placeId: "place-1", tipo: "registro" }),
      );
    });

    it("creates a solicitud for evento", async () => {
      mockFirebase.createDocument.mockResolvedValue({ id: "sol-2" });
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "sol-2",
        data: () =>
          makeSolicitudDoc({
            eventoId: "evento-1",
            tipo: "registro-evento",
            placeId: null,
          }),
      });

      const result = await adapter.create({
        eventoId: "evento-1",
        usuarioId: "user-abc",
        tipo: "registro-evento",
        status: "pendiente",
        createdAt: new Date("2026-01-01"),
      });

      expect(result.id).toBe("sol-2");
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "solicitudes",
        expect.objectContaining({ eventoId: "evento-1" }),
      );
    });
  });

  // =========================================================================
  // findById
  // =========================================================================
  describe("findById", () => {
    it("returns a solicitud when document exists", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "sol-1",
        data: () => makeSolicitudDoc(),
      });

      const result = await adapter.findById("sol-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("sol-1");
      expect(result!.placeId).toBe("place-1");
    });

    it("returns null when document does not exist", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        id: "sol-missing",
        data: () => null,
      });

      const result = await adapter.findById("sol-missing");

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // existsByPlaceId
  // =========================================================================
  describe("existsByPlaceId", () => {
    it("returns true when pending solicitudes exist for the place", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ id: "sol-1" }],
        }),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.existsByPlaceId("place-1");

      expect(result).toBe(true);
      expect(mockQuery.where).toHaveBeenCalledWith("placeId", "==", "place-1");
      expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "pendiente");
    });

    it("returns false when no pending solicitudes exist", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: true,
          docs: [],
        }),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.existsByPlaceId("place-1");

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // existsPendingByEventoId
  // =========================================================================
  describe("existsPendingByEventoId", () => {
    it("returns true when pending solicitudes exist for the evento", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ id: "sol-1" }],
        }),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.existsPendingByEventoId("evento-1");

      expect(result).toBe(true);
      expect(mockQuery.where).toHaveBeenCalledWith(
        "eventoId",
        "==",
        "evento-1",
      );
      expect(mockQuery.where).toHaveBeenCalledWith("status", "==", "pendiente");
    });

    it("returns false when no pending solicitudes exist", async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: true,
          docs: [],
        }),
      };
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.existsPendingByEventoId("evento-1");

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // findPendingReclamosByPlaceId
  // =========================================================================
  describe("findPendingReclamosByPlaceId", () => {
    it("returns pending reclamo-place solicitations for a place", async () => {
      const mockGet = jest.fn().mockResolvedValue({
        docs: [
          {
            id: "sol-reclamo-1",
            data: () =>
              makeSolicitudDoc({
                placeId: "place-1",
                tipo: "reclamo-place",
                status: "pendiente",
                solicitanteUid: "owner-uid",
              }),
          },
        ],
      });
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({ get: mockGet }),
            }),
          }),
        }),
      });

      const result = await adapter.findPendingReclamosByPlaceId("place-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("sol-reclamo-1");
      expect(result[0].tipo).toBe("reclamo-place");
      expect(result[0].solicitanteUid).toBe("owner-uid");
    });

    it("returns empty array when no reclamos exist", async () => {
      const mockGet = jest.fn().mockResolvedValue({ docs: [] });
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({ get: mockGet }),
            }),
          }),
        }),
      });

      const result = await adapter.findPendingReclamosByPlaceId("place-999");

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe("update", () => {
    it("updates a solicitud and returns it", async () => {
      // First call to getDocument is inside update()
      mockFirebase.getDocument.mockResolvedValueOnce({
        exists: true,
        id: "sol-1",
        data: () =>
          makeSolicitudDoc({
            status: "aprobado",
            revisadoPor: "admin-1",
          }),
      });

      mockFirebase.updateDocument.mockResolvedValue(undefined);

      const result = await adapter.update("sol-1", {
        status: "aprobado",
        revisadoPor: "admin-1",
      });

      expect(result.status).toBe("aprobado");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "solicitudes",
        "sol-1",
        expect.objectContaining({ status: "aprobado" }),
      );
    });
  });
});
