/**
 * Unit tests for `UsuariosRolLookupAdapter` (Task 6 — auth/infrastructure).
 *
 * Mocks `FirebaseService` (no real DB). The adapter implements
 * `AuthContextRepository.getRolByUid(uid)` — a SINGLE Firestore read on
 * `usuarios/{uid}` that returns the stored `Rol` or `undefined`.
 *
 * Behaviour contract covered here (per `tasks.md` 6.1):
 *
 *  - happy path: usuario exists with a valid `rol` → returns that `Rol`.
 *  - missing doc: usuario does not exist → returns `undefined` (no throw —
 *    `AuthService` is responsible for the 403 mapping).
 *  - Firestore error: propagates the error (the adapter MUST NOT swallow
 *    it and return a falsy "no role" — that would mask a real outage as
 *    "not provisioned").
 *
 * Extra defensive case (data integrity):
 *
 *  - corrupt doc: the doc exists but `rol` is not in `ROL_VALUES` →
 *    returns `undefined`. The adapter is the source-trust boundary; if
 *    the stored value is malformed, treat it as "no provisioning". The
 *    `AuthService` will then emit the canonical 403
 *    `user has not been provisioned in the usuarios collection`.
 *
 * Helpers follow the pattern of `usuarios-firestore.adapter.spec-helpers.ts`:
 * a `createMockFirebase()` factory wired with `jest.fn()` per method.
 */
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

import { UsuariosRolLookupAdapter } from "./usuarios-rol-lookup.adapter";
import type { Rol } from "../domain/rol.enum";
import { ROL_VALUES } from "../domain/rol.enum";

// ---------------------------------------------------------------------------
// Mock factory — same shape as `usuarios-firestore.adapter.spec-helpers` but
// scoped to the methods `UsuariosRolLookupAdapter` touches (only
// `getDocument`).
// ---------------------------------------------------------------------------
function createMockFirebase() {
  return {
    getDocument: jest.fn(),
  };
}

describe("UsuariosRolLookupAdapter", () => {
  let adapter: UsuariosRolLookupAdapter;
  let mockFirebase: ReturnType<typeof createMockFirebase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase = createMockFirebase();
    adapter = new UsuariosRolLookupAdapter(
      mockFirebase as unknown as ConstructorParameters<
        typeof UsuariosRolLookupAdapter
      >[0],
    );
  });

  // -------------------------------------------------------------------------
  // Happy path — existing usuario with a valid rol
  // -------------------------------------------------------------------------
  describe("getRolByUid — happy path", () => {
    it.each(ROL_VALUES as unknown as Rol[])(
      "returns '%s' when the usuarios doc stores that rol",
      async (rol) => {
        mockFirebase.getDocument.mockResolvedValue({
          exists: true,
          id: "uid-001",
          data: () => ({ email: "x@example.com", nombre: "X", rol }),
        });

        const result = await adapter.getRolByUid("uid-001");

        expect(result).toBe(rol);
        expect(mockFirebase.getDocument).toHaveBeenCalledWith(
          "usuarios",
          "uid-001",
        );
      },
    );

    it("reads the 'usuarios' collection (not 'auth_tokens' / anything else)", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "uid-001",
        data: () => ({ rol: "admin" }),
      });

      await adapter.getRolByUid("uid-001");

      expect(mockFirebase.getDocument).toHaveBeenCalledTimes(1);
      const [collection] = mockFirebase.getDocument.mock.calls[0];
      expect(collection).toBe("usuarios");
    });
  });

  // -------------------------------------------------------------------------
  // Missing document — returns undefined (AuthService maps the 403)
  // -------------------------------------------------------------------------
  describe("getRolByUid — missing usuarios doc", () => {
    it("returns undefined when the doc does not exist", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: false,
        id: "uid-orphan",
        data: () => undefined,
      });

      const result = await adapter.getRolByUid("uid-orphan");

      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Firestore error — propagates (no swallow)
  // -------------------------------------------------------------------------
  describe("getRolByUid — Firestore error", () => {
    it("propagates the Firestore error (does NOT swallow as undefined)", async () => {
      const firestoreError = new Error("Firestore unavailable");
      mockFirebase.getDocument.mockRejectedValue(firestoreError);

      await expect(adapter.getRolByUid("uid-001")).rejects.toBe(firestoreError);
    });
  });

  // -------------------------------------------------------------------------
  // Defensive — corrupt doc with a rol value NOT in ROL_VALUES
  // -------------------------------------------------------------------------
  describe("getRolByUid — corrupt doc (rol outside ROL_VALUES)", () => {
    it("returns undefined when the stored rol is not a valid Rol (treats as not provisioned)", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "uid-001",
        // Simulo un doc legacy/corrupto con un valor de rol desconocido.
        data: () => ({ email: "x@example.com", rol: "superadmin" }),
      });

      const result = await adapter.getRolByUid("uid-001");

      expect(result).toBeUndefined();
    });

    it("returns undefined when the doc has no 'rol' field at all", async () => {
      mockFirebase.getDocument.mockResolvedValue({
        exists: true,
        id: "uid-001",
        data: () => ({ email: "x@example.com", nombre: "X" }),
      });

      const result = await adapter.getRolByUid("uid-001");

      expect(result).toBeUndefined();
    });
  });
});
