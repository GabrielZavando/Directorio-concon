import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseService } from "@/common/services/firebase.service";
import { EmpresaFirestoreAdapter } from "./empresa-firestore.adapter";

// Mock firebase-admin submodules (external service — never loaded by Jest)
jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApps: jest.fn(() => []),
}));
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
  Timestamp: { fromDate: jest.fn(), now: jest.fn() },
  FieldValue: { serverTimestamp: jest.fn() },
}));
jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(),
}));
jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(),
}));

describe("EmpresaFirestoreAdapter", () => {
  let adapter: EmpresaFirestoreAdapter;

  const makeFirestore = () => {
    const store: Record<string, Record<string, any>> = {};

    const firestore: any = {
      collection: jest.fn((name: string) => {
        if (!store[name]) store[name] = {};
        const coll = {
          doc: jest.fn((id?: string) => {
            const docId = id || `gen-${Object.keys(store[name]).length + 1}`;
            return {
              id: docId,
              set: jest.fn(async (data: any) => {
                store[name][docId] = { id: docId, ...data };
              }),
              get: jest.fn(async () => ({
                exists: Boolean(store[name][docId]),
                id: docId,
                data: () => store[name][docId],
              })),
              update: jest.fn(async (data: any) => {
                store[name][docId] = { ...store[name][docId], ...data };
              }),
              delete: jest.fn(async () => {
                delete store[name][docId];
              }),
            };
          }),
          where: jest.fn((field: string, op: string, value: any) => {
            const wheres = [{ field, op, value }];
            const q = {
              where: jest.fn((f: string, o: string, v: any) => {
                wheres.push({ field: f, op: o, value: v });
                return q;
              }),
              orderBy: jest.fn(() => q),
              limit: jest.fn(() => q),
              get: jest.fn(async () => {
                let docs = Object.values(store[name]);
                docs = docs.filter((d) =>
                  wheres.every((w) => d[w.field] === w.value),
                );
                return {
                  docs: docs.map((d) => ({
                    id: d.id,
                    data: () => d,
                    exists: true,
                  })),
                  empty: docs.length === 0,
                  size: docs.length,
                };
              }),
            };
            return q;
          }),
          orderBy: jest.fn(() => coll),
          limit: jest.fn(() => coll),
          get: jest.fn(async () => {
            const docs = Object.values(store[name]);
            return {
              docs: docs.map((d) => ({
                id: d.id,
                data: () => d,
                exists: true,
              })),
              empty: docs.length === 0,
              size: docs.length,
            };
          }),
        };
        return coll;
      }),
    };
    return { firestore, store };
  };

  let ctx: ReturnType<typeof makeFirestore>;
  let firebaseService: { getFirestore: jest.Mock; getCurrentTimestamp: jest.Mock };

  beforeEach(async () => {
    ctx = makeFirestore();
    firebaseService = {
      getFirestore: jest.fn(() => ctx.firestore),
      getCurrentTimestamp: jest.fn(() => ({
        toDate: () => new Date("2026-01-15T10:00:00Z"),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresaFirestoreAdapter,
        { provide: FirebaseService, useValue: firebaseService },
      ],
    }).compile();

    adapter = module.get<EmpresaFirestoreAdapter>(EmpresaFirestoreAdapter);
  });

  const baseData = {
    nombre: "Test Empresa",
    slug: "test-empresa",
    descripcion: "Una empresa de prueba",
    categoriaId: "cat-001",
    barrioId: "bar-001",
    direccion: "Av. Test 123",
    planId: "gratuito",
    destacado: false,
    verificado: false,
    status: "pendiente" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  describe("create", () => {
    it("creates and returns empresa with generated id", async () => {
      const result = await adapter.create(baseData);
      expect(result.id).toBeDefined();
      expect(result.slug).toBe("test-empresa");
      expect(result.status).toBe("pendiente");
    });
  });

  describe("findById", () => {
    it("returns empresa by id", async () => {
      const created = await adapter.create(baseData);
      const found = await adapter.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it("returns null for missing id", async () => {
      const found = await adapter.findById("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("returns empresa by slug", async () => {
      await adapter.create(baseData);
      const found = await adapter.findBySlug("test-empresa");
      expect(found).not.toBeNull();
      expect(found!.slug).toBe("test-empresa");
    });

    it("returns null for missing slug", async () => {
      const found = await adapter.findBySlug("no-existe");
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    it("returns paginated results", async () => {
      await adapter.create({ ...baseData, slug: "e1" });
      await adapter.create({ ...baseData, slug: "e2" });
      const result = await adapter.findAll({}, 1, 10);
      expect(result.data.length).toBe(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe("update", () => {
    it("updates and returns empresa", async () => {
      const created = await adapter.create(baseData);
      const updated = await adapter.update(created.id, { nombre: "Updated" });
      expect(updated.nombre).toBe("Updated");
    });
  });

  describe("delete", () => {
    it("deletes empresa", async () => {
      const created = await adapter.create(baseData);
      await adapter.delete(created.id);
      const found = await adapter.findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe("slugExists", () => {
    it("returns true when slug exists", async () => {
      await adapter.create(baseData);
      expect(await adapter.slugExists("test-empresa")).toBe(true);
    });

    it("returns false when slug does not exist", async () => {
      expect(await adapter.slugExists("no-existe")).toBe(false);
    });
  });
});
