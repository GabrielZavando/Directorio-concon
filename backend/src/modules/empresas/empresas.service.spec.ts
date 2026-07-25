import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import { EmpresasService } from "./application/empresas.service";
import { EmpresaRepository } from "./domain/empresa-repository.interface";
import { Empresa } from "./domain/empresa.entity";

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
  let empresaRepo: jest.Mocked<EmpresaRepository>;
  let firebaseService: {
    getFirestore: jest.Mock;
    getCurrentTimestamp: jest.Mock;
  };

  const NOW = new Date("2026-01-15T10:00:00Z");

  const makeEmpresa = (overrides: Partial<Empresa> = {}): Empresa => ({
    id: "emp-001",
    nombre: "Restaurante El Marino",
    slug: "restaurante-el-marino",
    descripcion: "Restaurante de mariscos frescos de la zona.",
    categoriaId: "cat-restaurantes",
    barrioId: "barrio-centro",
    direccion: "Av. Borgoño 123, Concón",
    destacado: false,
    verificado: false,
    status: "pendiente",
    planId: "gratuito",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });

  beforeEach(async () => {
    empresaRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      slugExists: jest.fn(),
    };

    firebaseService = {
      getFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            set: jest.fn(),
          })),
        })),
      })),
      getCurrentTimestamp: jest.fn(() => ({ toDate: () => NOW })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresasService,
        { provide: EmpresaRepository, useValue: empresaRepo },
        { provide: FirebaseService, useValue: firebaseService },
      ],
    }).compile();

    service = module.get<EmpresasService>(EmpresasService);
  });

  const baseDto = {
    nombre: "Restaurante El Marino",
    descripcion: "Restaurante de mariscos frescos de la zona.",
    categoriaId: "cat-restaurantes",
    barrioId: "barrio-centro",
    direccion: "Av. Borgoño 123, Concón",
    planId: "gratuito",
  };

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates an empresa with status pendiente and a slug", async () => {
      empresaRepo.slugExists.mockResolvedValue(false);
      empresaRepo.create.mockResolvedValue(makeEmpresa());

      const result = await service.create(baseDto as any);

      expect(result.id).toBeDefined();
      expect(result.slug).toBe("restaurante-el-marino");
      expect(result.status).toBe("pendiente");
      expect(empresaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "restaurante-el-marino",
          status: "pendiente",
        }),
      );
    });

    it("creates an associated solicitud of type registro", async () => {
      empresaRepo.slugExists.mockResolvedValue(false);
      empresaRepo.create.mockResolvedValue(makeEmpresa());

      await service.create(baseDto as any);

      // Solicitud is created via FirebaseService (known coupling)
      expect(firebaseService.getFirestore).toHaveBeenCalled();
    });

    it("throws ConflictException on duplicate slug", async () => {
      empresaRepo.slugExists.mockResolvedValue(true);

      await expect(service.create(baseDto as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("findOne", () => {
    it("returns the empresa by id", async () => {
      empresaRepo.findById.mockResolvedValue(makeEmpresa());
      const found = await service.findOne("emp-001");
      expect(found.id).toBe("emp-001");
    });

    it("throws NotFoundException when not found", async () => {
      empresaRepo.findById.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("findBySlug", () => {
    it("returns the empresa by slug", async () => {
      empresaRepo.findBySlug.mockResolvedValue(makeEmpresa());
      const found = await service.findBySlug("restaurante-el-marino");
      expect(found.slug).toBe("restaurante-el-marino");
    });

    it("throws NotFoundException when slug not found", async () => {
      empresaRepo.findBySlug.mockResolvedValue(null);
      await expect(service.findBySlug("nope")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("returns data and meta with defaults", async () => {
      empresaRepo.findAll.mockResolvedValue({
        data: [makeEmpresa()],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      const result = await service.findAll({}, 1, 20);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("update", () => {
    it("updates an existing empresa", async () => {
      empresaRepo.findById.mockResolvedValue(makeEmpresa());
      empresaRepo.update.mockResolvedValue(
        makeEmpresa({ telefono: "+56912345678" } as any),
      );
      const updated = await service.update("emp-001", {
        telefono: "+56912345678",
      } as any);
      expect(updated.telefono).toBe("+56912345678");
    });

    it("throws NotFoundException when updating missing", async () => {
      empresaRepo.findById.mockResolvedValue(null);
      await expect(
        service.update("missing", { telefono: "+569" } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("remove", () => {
    it("removes an existing empresa", async () => {
      empresaRepo.findById.mockResolvedValue(makeEmpresa());
      empresaRepo.delete.mockResolvedValue();
      await service.remove("emp-001");
      expect(empresaRepo.delete).toHaveBeenCalledWith("emp-001");
    });

    it("throws NotFoundException when removing missing", async () => {
      empresaRepo.findById.mockResolvedValue(null);
      await expect(service.remove("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
