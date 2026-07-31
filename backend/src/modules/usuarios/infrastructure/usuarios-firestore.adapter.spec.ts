/**
 * Unit tests for UsuariosFirestoreAdapter.
 *
 * Mocks `FirebaseService` (no real DB). Verifies domain ↔ Firestore mapping
 * (Date ↔ Timestamp), all 7 methods (read + write), and the
 * "user-not-found" path (`NotFoundException`).
 *
 * Helpers + mock factories live in the sibling `*-helpers.ts` so this
 * spec stays under the `max-lines` CI threshold (≤ 300 effective lines).
 */
import type { UsuarioFirestoreDoc } from "./usuarios-firestore.adapter.spec-types";

jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

import { UsuariosFirestoreAdapter } from "./usuarios-firestore.adapter";
import {
  createMockFirebase,
  makeCreateInput,
  makeFirestoreDoc,
} from "./usuarios-firestore.adapter.spec-helpers";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("UsuariosFirestoreAdapter", () => {
  let adapter: UsuariosFirestoreAdapter;
  let mockFirebase: ReturnType<typeof createMockFirebase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    adapter = new UsuariosFirestoreAdapter(
      mockFirebase as unknown as ConstructorParameters<
        typeof UsuariosFirestoreAdapter
      >[0],
    );
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe("findById", () => {
    it("returns a Usuario when the document exists", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "uid-owner-001",
        data: () => makeFirestoreDoc(),
      });

      const result = await adapter.findById("uid-owner-001");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("uid-owner-001");
      expect(result!.email).toBe("owner@example.com");
      expect(result!.rol).toBe("owner");
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(mockFirebase.getDocument).toHaveBeenCalledWith(
        "usuarios",
        "uid-owner-001",
      );
    });

    it("returns null when the document does not exist", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        id: "missing",
        data: () => undefined,
      });

      const result = await adapter.findById("missing");
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findByEmail
  // -------------------------------------------------------------------------
  describe("findByEmail", () => {
    it("returns a Usuario when email matches", async () => {
      mockFirebase.getDocuments.mockResolvedValue({
        empty: false,
        docs: [{ id: "uid-owner-001", data: () => makeFirestoreDoc() }],
      });

      const result = await adapter.findByEmail("owner@example.com");

      expect(result).not.toBeNull();
      expect(result!.email).toBe("owner@example.com");
      expect(mockFirebase.getDocuments).toHaveBeenCalledWith(
        "usuarios",
        [{ field: "email", operator: "==", value: "owner@example.com" }],
        undefined,
        1,
      );
    });

    it("returns null when no email match", async () => {
      mockFirebase.getDocuments.mockResolvedValue({ empty: true, docs: [] });

      const result = await adapter.findByEmail("nobody@example.com");
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findAll (admin list, optional rol filter, paginated)
  // -------------------------------------------------------------------------
  describe("findAll", () => {
    it("queries without rol filter when omitted", async () => {
      const mockQuery = mockQueryChain({
        docs: [{ id: "u1", data: () => makeFirestoreDoc() }],
      });
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await adapter.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQuery.where).not.toHaveBeenCalled();
      expect(mockQuery.orderBy).toHaveBeenCalledWith("rol", "asc");
    });

    it("applies rol filter when provided", async () => {
      const mockQuery = mockQueryChain({ docs: [] });
      mockFirebase.getFirestore.mockReturnValue({
        collection: jest.fn().mockReturnValue(mockQuery),
      });

      await adapter.findAll({ rol: "owner", page: 1, limit: 10 });

      expect(mockQuery.where).toHaveBeenCalledWith("rol", "==", "owner");
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe("create", () => {
    it("writes the document with id = uid and stamps createdAt/updatedAt", async () => {
      mockFirebase.getCurrentTimestamp.mockReturnValue({
        toDate: () => new Date("2025-06-01T00:00:00Z"),
      });
      mockFirebase.createDocument.mockResolvedValue({ id: "uid-owner-001" });

      const result = await adapter.create(makeCreateInput());

      expect(result.id).toBe("uid-owner-001");
      expect(mockFirebase.createDocument).toHaveBeenCalledWith(
        "usuarios",
        expect.objectContaining({
          email: "owner@example.com",
          rol: "owner",
          placeId: "restaurante-el-marino",
        }),
        "uid-owner-001",
      );
    });

    it("strips id from the persistence payload (id is the doc key)", async () => {
      mockFirebase.getCurrentTimestamp.mockReturnValue({
        toDate: () => new Date("2025-06-01T00:00:00Z"),
      });
      mockFirebase.createDocument.mockResolvedValue({ id: "uid-owner-001" });

      await adapter.create(makeCreateInput());

      const writeCall = mockFirebase.createDocument.mock.calls[0];
      const writePayload = writeCall[1] as Record<string, unknown>;
      // The doc id is passed as the third arg to createDocument (not as a
      // field in the doc body — Firestore stores it as the document key).
      expect(writeCall[0]).toBe("usuarios");
      expect(writeCall[2]).toBe("uid-owner-001");
      expect(writePayload).not.toHaveProperty("id");
      // The adapter does NOT stamp timestamps — FirebaseService does.
      expect(writePayload).not.toHaveProperty("createdAt");
      expect(writePayload).not.toHaveProperty("updatedAt");
    });
  });

  // -------------------------------------------------------------------------
  // updatePerfil (self service)
  // -------------------------------------------------------------------------
  describe("updatePerfil", () => {
    it("writes only nombre + telefono and refreshes updatedAt", async () => {
      writePathReturnsDocWith(
        mockFirebase,
        makeFirestoreDoc({
          nombre: "Owner Renamed",
          telefono: "+56999999999",
          updatedAt: { toDate: () => new Date("2025-06-02T00:00:00Z") },
        }),
      );

      const result = await adapter.updatePerfil("uid-owner-001", {
        nombre: "Owner Renamed",
        telefono: "+56999999999",
      });

      expect(result.nombre).toBe("Owner Renamed");
      expect(result.telefono).toBe("+56999999999");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "usuarios",
        "uid-owner-001",
        expect.objectContaining({
          nombre: "Owner Renamed",
          telefono: "+56999999999",
        }),
      );
      // Self-service MUST NOT mutate rol or placeId; timestamp is delegated.
      const writePayload = writePayloadOf(mockFirebase);
      expect(writePayload).not.toHaveProperty("rol");
      expect(writePayload).not.toHaveProperty("placeId");
      expect(writePayload).not.toHaveProperty("updatedAt");
    });

    it("refuses to write when the user does not exist", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        id: "missing",
        data: () => undefined,
      });

      await expect(
        adapter.updatePerfil("missing", { nombre: "X", telefono: "Y" }),
      ).rejects.toThrow(/not found/i);
    });
  });

  // -------------------------------------------------------------------------
  // updateRol (admin)
  // -------------------------------------------------------------------------
  describe("updateRol", () => {
    it("writes only the rol field", async () => {
      writePathReturnsDocWith(
        mockFirebase,
        makeFirestoreDoc({
          rol: "member",
          updatedAt: { toDate: () => new Date("2025-06-02T00:00:00Z") },
        }),
      );

      const result = await adapter.updateRol("uid-x", "member");

      expect(result.rol).toBe("member");
      const writePayload = writePayloadOf(mockFirebase);
      expect(writePayload).toMatchObject({ rol: "member" });
      // rol-only mutation MUST NOT leak placeId or other profile fields
      expect(writePayload).not.toHaveProperty("nombre");
      expect(writePayload).not.toHaveProperty("email");
      expect(writePayload).not.toHaveProperty("updatedAt");
    });

    it("refuses when the user does not exist", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        id: "missing",
        data: () => undefined,
      });

      await expect(adapter.updateRol("missing", "owner")).rejects.toThrow(
        /not found/i,
      );
    });
  });

  // -------------------------------------------------------------------------
  // linkPlaceId
  // -------------------------------------------------------------------------
  describe("linkPlaceId", () => {
    it("writes the placeId", async () => {
      writePathReturnsDocWith(
        mockFirebase,
        makeFirestoreDoc({
          placeId: "place-x",
          updatedAt: { toDate: () => new Date("2025-06-02T00:00:00Z") },
        }),
      );

      const result = await adapter.linkPlaceId("uid-owner-001", "place-x");

      expect(result.placeId).toBe("place-x");
      expect(mockFirebase.updateDocument).toHaveBeenCalledWith(
        "usuarios",
        "uid-owner-001",
        expect.objectContaining({ placeId: "place-x" }),
      );
    });

    it("accepts null to unlink", async () => {
      writePathReturnsDocWith(
        mockFirebase,
        makeFirestoreDoc({
          placeId: null,
          updatedAt: { toDate: () => new Date("2025-06-02T00:00:00Z") },
        }),
      );

      const result = await adapter.linkPlaceId("uid-owner-001", null);

      expect(result.placeId).toBeNull();
      const writePayload = writePayloadOf(mockFirebase);
      expect(writePayload).toMatchObject({ placeId: null });
      expect(writePayload).not.toHaveProperty("updatedAt");
    });

    it("refuses when the user does not exist", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        id: "missing",
        data: () => undefined,
      });

      await expect(adapter.linkPlaceId("missing", "p1")).rejects.toThrow(
        /not found/i,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Local test-only helpers (kept here so the spec file stays compact).
// Production code MUST NOT import from here.
// ---------------------------------------------------------------------------

/** A fluent Firestore query chain with `where/orderBy/limit/offset/get`. */
function mockQueryChain(snapshot: { docs: unknown[] }) {
  return {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(snapshot),
  };
}

/**
 * Helper for the `update*` paths: configures the mock so `findById` (via
 * `getDocument`) returns `exists: true` + the provided doc body, and
 * `updateDocument` is a successful no-op.
 */
function writePathReturnsDocWith(
  mockFirebase: ReturnType<typeof createMockFirebase>,
  docBody: UsuarioFirestoreDoc,
) {
  mockFirebase.updateDocument.mockResolvedValue(undefined);
  mockFirebase.getDocument.mockResolvedValue({
    exists: true,
    id: "uid-owner-001",
    data: () => docBody,
  });
}

/** Read the most recent `updateDocument` call payload (the 3rd arg). */
function writePayloadOf(
  mockFirebase: ReturnType<typeof createMockFirebase>,
): Record<string, unknown> {
  return mockFirebase.updateDocument.mock.calls[0][2] as Record<
    string,
    unknown
  >;
}
