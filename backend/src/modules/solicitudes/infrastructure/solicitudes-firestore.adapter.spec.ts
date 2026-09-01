/**
 * Unit tests for SolicitudesFirestoreAdapter.
 * Mocks FirebaseService directly without Nest DI to avoid module resolution issues.
 *
 * CH-05 (solicitudes-refactor):
 *  - `create` persists only `reclamo-place` documents (no `eventoId`/`proposal`).
 *  - `findPendingQueue` backs the admin queue listing.
 *  - `existsByPlaceId` is kept as a concrete method (the places module's local
 *    interface still depends on it at runtime for its delete-guard), even
 *    though it is no longer part of the solicitudes-module interface.
 *  - `existsPendingByEventoId` is removed.
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
    usuarioId: "user-abc",
    tipo: "reclamo-place",
    status: "pendiente",
    solicitanteUid: "claim-1",
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
    it("creates a reclamo-place solicitud document and returns it", async () => {
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
        tipo: "reclamo-place",
        status: "pendiente",
        solicitanteUid: "claim-1",
        createdAt: new Date("2026-01-01"),
      });

      expect(result.id).toBe("sol-1");
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "solicitudes",
        expect.objectContaining({
          placeId: "place-1",
          tipo: "reclamo-place",
          solicitanteUid: "claim-1",
        }),
      );
    });

    it("never persists the removed eventoId/proposal fields", async () => {
      mockFirebase.createDocument.mockResolvedValue({ id: "sol-1" });
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "sol-1",
        data: () => makeSolicitudDoc(),
      });
      mockFirebase.getCurrentTimestamp.mockReturnValue({
        toDate: () => new Date("2026-01-01"),
      });

      await adapter.create({
        placeId: "place-1",
        usuarioId: "user-abc",
        tipo: "reclamo-place",
        status: "pendiente",
        solicitanteUid: "claim-1",
        createdAt: new Date("2026-01-01"),
      });

      const written = mockFirebase.createDocument.mock.calls[0][1];
      expect(written).not.toHaveProperty("eventoId");
      expect(written).not.toHaveProperty("proposal");
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
      expect(result!.tipo).toBe("reclamo-place");
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
  // existsByPlaceId (concrete method, kept for the places module's delete-guard)
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
  // findPendingQueue (CH-05 admin queue)
  // =========================================================================
  describe("findPendingQueue", () => {
    /**
     * Shared query-chain stub. Both the count query and the data query start
     * from `collection(...).where(...)`, so a single chain object exposes both
     * `count()` (→ countGet) and the data-chain methods (orderBy/offset/limit/get).
     */
    function stubQueueChain(dataGet: jest.Mock, countGet: jest.Mock) {
      const countQuery = { get: countGet };
      const chain = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnValue(countQuery),
        get: dataGet,
      };
      const where = jest.fn().mockReturnValue(chain);
      const collection = jest.fn().mockReturnValue({ where });
      mockFirebase.getFirestore.mockReturnValue({ collection });
      return { collection, chain, where, countQuery };
    }

    it("queries reclamo-place by status, orders by createdAt desc and paginates; returns data + total", async () => {
      const dataGet = jest.fn().mockResolvedValue({
        docs: [
          {
            id: "sol-1",
            data: () => makeSolicitudDoc({ id: "sol-1", status: "pendiente" }),
          },
        ],
      });
      const countGet = jest.fn().mockResolvedValue({
        data: () => ({ count: 1 }),
      });
      const { collection, chain, where } = stubQueueChain(dataGet, countGet);

      const result = await adapter.findPendingQueue("pendiente", 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(collection).toHaveBeenCalledWith("solicitudes");
      // Both queries filter on tipo and status
      expect(where).toHaveBeenCalledWith("tipo", "==", "reclamo-place");
      expect(chain.where).toHaveBeenCalledWith("status", "==", "pendiente");
      // Data query ordering + pagination
      expect(chain.orderBy).toHaveBeenCalledWith("createdAt", "desc");
      expect(chain.offset).toHaveBeenCalledWith(0); // page 1 limit 20
      expect(chain.limit).toHaveBeenCalledWith(20);
      // Count query via chain.count
      expect(chain.count).toHaveBeenCalled();
    });

    it("maps page to offset (page 3, limit 10 → offset 20)", async () => {
      const dataGet = jest.fn().mockResolvedValue({ docs: [] });
      const countGet = jest
        .fn()
        .mockResolvedValue({ data: () => ({ count: 0 }) });
      const { chain, collection } = stubQueueChain(dataGet, countGet);

      await adapter.findPendingQueue("aprobado", 3, 10);

      expect(collection).toHaveBeenCalledWith("solicitudes");
      expect(chain.offset).toHaveBeenCalledWith(20);
      expect(chain.limit).toHaveBeenCalledWith(10);
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe("update", () => {
    it("updates a solicitud and returns it", async () => {
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
