/**
 * Shared test helpers for CategoriaFirestoreAdapter specs.
 * Kept in a separate file so the adapter spec stays under the 300-line CI limit.
 */
import { Categoria } from "../domain/categoria.entity";
import { Subcategoria } from "../domain/subcategoria.vo";

const MOCK_DATE = new Date("2026-01-01");

export function createMockFirebase() {
  return {
    getFirestore: jest.fn(),
    getDocument: jest.fn(),
    getDocuments: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    runTransaction: jest.fn(),
    getCurrentTimestamp: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })),
    dateToTimestamp: jest.fn((d: Date) => ({ toDate: () => d })),
    timestampToDate: jest.fn((t: unknown) => {
      if (t && typeof t === "object" && "toDate" in t) {
        return (t as { toDate: () => Date }).toDate();
      }
      return null;
    }),
  };
}

export function makeFirestoreDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "gastronomia",
    nombre: "Gastronomía",
    slug: "gastronomia",
    icono: "utensils",
    orden: 1,
    activo: true,
    subcategorias: [
      { slug: "restaurantes", nombre: "Restaurantes", activo: true },
    ],
    createdAt: { toDate: () => MOCK_DATE },
    updatedAt: { toDate: () => MOCK_DATE },
    ...overrides,
  };
}

type MockFirebase = ReturnType<typeof createMockFirebase>;

/**
 * Wires getFirestore() + runTransaction() so the transaction callback receives
 * the given doc (or a missing-doc when `undefined`). Returns the tx.update spy.
 */
export function mockTransaction(
  mockFirebase: MockFirebase,
  doc: Record<string, unknown> | undefined,
  txUpdate: jest.Mock = jest.fn(),
): jest.Mock {
  mockFirebase.getFirestore.mockReturnValue({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({ id: doc?.id ?? "gastronomia" }),
    }),
  });
  mockFirebase.runTransaction.mockImplementation(async (fn) =>
    fn({
      get: async () =>
        doc
          ? { exists: true, data: () => doc }
          : { exists: false, data: () => undefined },
      update: txUpdate,
    }),
  );
  return txUpdate;
}

/** Minimal Categoria entity for write-path tests. */
export function makeCatEntity(
  overrides: Partial<{
    id: string;
    slug: string;
    nombre: string;
    icono: string;
    orden: number;
    activo: boolean;
    subcategorias: Array<{ slug: string; nombre: string; activo: boolean }>;
  }> = {},
): Categoria {
  return new Categoria({
    id: overrides.id ?? "gastronomia",
    nombre: overrides.nombre ?? "Gastronomía",
    slug: overrides.slug ?? "gastronomia",
    icono: overrides.icono ?? "utensils",
    orden: overrides.orden ?? 1,
    activo: overrides.activo ?? true,
    subcategorias: (overrides.subcategorias ?? []).map(
      (s) => new Subcategoria(s),
    ),
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
  });
}
