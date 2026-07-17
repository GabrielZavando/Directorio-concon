import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import { EmpresasService } from "./empresas.service";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";
import { Empresa } from "./entities/empresa.entity";

// firebase-admin is an external service; mock its submodules so the real SDK
// (which pulls ESM-only deps like jose) is never loaded by Jest.
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

describe("EmpresasService", () => {
  let service: EmpresasService;
  let firebaseService: {
    getFirestore: jest.Mock;
    getCurrentTimestamp: jest.Mock;
  };

  const makeFirestore = () => {
    const store: Record<string, Record<string, any>> = {};
    type Where = { field: string; op: string; value: any };

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
              })) as any,
              update: jest.fn(async (data: any) => {
                store[name][docId] = { ...store[name][docId], ...data };
              }),
              delete: jest.fn(async () => {
                delete store[name][docId];
              }),
            };
          }),
          where: jest.fn((field: string, op: string, value: any) => {
            const wheres: Where[] = [{ field, op, value }];
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

  beforeEach(async () => {
    ctx = makeFirestore();
    firebaseService = {
      getFirestore: jest.fn(() => ctx.firestore),
      getCurrentTimestamp: jest.fn(() => ({ toDate: () => new Date() }) as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresasService,
        { provide: FirebaseService, useValue: firebaseService },
      ],
    }).compile();

    service = module.get<EmpresasService>(EmpresasService);
  });

  const baseDto: CreateEmpresaDto = {
    nombre: "Restaurante El Marino",
    descripcion: "Restaurante de mariscos frescos de la zona.",
    categoriaId: "cat-restaurantes",
    barrioId: "barrio-centro",
    direccion: "Av. Borgoño 123, Concón",
    planId: "gratuito",
  } as CreateEmpresaDto;

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates an empresa with status pendiente and a slug", async () => {
      const result = await service.create(baseDto);

      expect(result.id).toBeDefined();
      expect(result.slug).toBe("restaurante-el-marino");
      expect(result.status).toBe("pendiente");
      expect(result.createdAt).toBeDefined();
    });

    it("creates an associated solicitud of type registro", async () => {
      const result = await service.create(baseDto);
      expect(ctx.store["solicitudes"]).toBeDefined();
      const solicitud = Object.values(ctx.store["solicitudes"])[0];
      expect(solicitud.tipo).toBe("registro");
      expect(solicitud.empresaId).toBe(result.id);
      expect(solicitud.status).toBe("pendiente");
    });

    it("throws ConflictException on duplicate slug", async () => {
      await service.create(baseDto);
      await expect(service.create(baseDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("findOne", () => {
    it("returns the empresa by id", async () => {
      const created = await service.create(baseDto);
      const found = await service.findOne(created.id);
      expect(found.id).toBe(created.id);
    });

    it("throws NotFoundException when not found", async () => {
      await expect(service.findOne("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("findBySlug", () => {
    it("returns the empresa by slug", async () => {
      const created = await service.create(baseDto);
      const found = await service.findBySlug(created.slug);
      expect(found.slug).toBe(created.slug);
    });

    it("throws NotFoundException when slug not found", async () => {
      await expect(service.findBySlug("nope")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("returns data and meta with defaults", async () => {
      await service.create(baseDto);
      const result = await service.findAll({}, 1, 20);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  describe("update", () => {
    it("updates an existing empresa", async () => {
      const created = await service.create(baseDto);
      const updated = await service.update(created.id, {
        telefono: "+56912345678",
      } as any);
      expect(updated.telefono).toBe("+56912345678");
    });

    it("throws NotFoundException when updating missing", async () => {
      await expect(
        service.update("missing", { telefono: "+569" } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("remove", () => {
    it("removes an existing empresa", async () => {
      const created = await service.create(baseDto);
      await service.remove(created.id);
      await expect(service.findOne(created.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws NotFoundException when removing missing", async () => {
      await expect(service.remove("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
