/**
 * Test-only factories for the `usuarios` adapter spec.
 *
 * Extracted from `usuarios-firestore.adapter.spec.ts` so the spec itself
 * stays under the `max-lines` threshold (≤ 300 effective lines per
 * `docs/backend-standards.md` SRP thresholds). Test-only artefacts — these
 * helpers MUST NOT be imported by production code.
 */
import type { Usuario } from "../domain/usuario.entity";

/**
 * Mock factory for `FirebaseService` — the shape used by
 * `UsuariosFirestoreAdapter`. Every method the adapter touches is included
 * as a `jest.fn()` so tests can wire `.mockResolvedValue` /
 * `.mockResolvedValueOnce` per case.
 */
export function createMockFirebase() {
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

/** A canonical Firestore doc body for a Usuario. */
export function makeFirestoreDoc(
  overrides: Record<string, unknown> = {},
): import("./usuarios-firestore.adapter").UsuarioFirestoreDoc {
  return {
    email: "owner@example.com",
    nombre: "Owner One",
    rol: "owner",
    placeId: "restaurante-el-marino",
    telefono: "+56912345678",
    createdAt: { toDate: () => new Date("2025-06-01T00:00:00Z") },
    updatedAt: { toDate: () => new Date("2025-06-01T00:00:00Z") },
    ...overrides,
  } as import("./usuarios-firestore.adapter").UsuarioFirestoreDoc;
}

/** Default `Omit<Usuario, "createdAt" | "updatedAt">` for `create` tests. */
export function makeCreateInput(
  overrides: Partial<Omit<Usuario, "createdAt" | "updatedAt">> = {},
): Omit<Usuario, "createdAt" | "updatedAt"> {
  return {
    id: "uid-owner-001",
    email: "owner@example.com",
    nombre: "Owner One",
    rol: "owner",
    placeId: "restaurante-el-marino",
    telefono: "+56912345678",
    ...overrides,
  };
}
