/**
 * E2E tests for CategoriasController. Mocks the repositories and
 * AuthService.buildContext — guards run for real to exercise 401/403 contracts.
 */
import { Test, type TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import request from "supertest";
import { CategoriasModule } from "../categorias.module";
import { FirebaseModule } from "@/common/modules/firebase.module";
import { AuthService } from "../../auth/application/auth.service";
import {
  CATEGORIA_READ_REPOSITORY,
  type CategoriaReadRepository,
} from "../domain/categoria-read-repository.interface";
import {
  CATEGORIA_WRITE_REPOSITORY,
  type CategoriaWriteRepository,
} from "../domain/categoria-write-repository.interface";
import {
  BARRIO_READ_REPOSITORY,
  type BarrioReadRepository,
} from "../../barrios/domain/barrio-read-repository.interface";
import { Subcategoria } from "../domain/subcategoria.vo";
import type { AuthContext } from "../../auth/domain/auth-context.interface";
import type { Rol } from "../../auth/domain/rol.enum";
import { makeCat } from "./categorias.controller.spec-helpers";

// Mock FirebaseService so firebase-admin ESM deps never load in jest.
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

describe("CategoriasController (E2E)", () => {
  let app: INestApplication;
  let mockAuthService: { buildContext: jest.Mock };
  let barrioRepo: jest.Mocked<BarrioReadRepository>;
  let readRepo: jest.Mocked<CategoriaReadRepository>;
  let writeRepo: jest.Mocked<CategoriaWriteRepository>;

  function givenUser(rol: Rol): AuthContext {
    const ctx: AuthContext = {
      uid: `uid-${rol}-001`,
      email: `${rol}@example.com`,
      rol,
    };
    mockAuthService.buildContext.mockResolvedValue(ctx);
    return ctx;
  }

  function authReq(
    method: "get" | "post" | "patch" | "delete",
    url: string,
  ): request.Test {
    const req = request(app.getHttpServer())[method](url);
    return req.set("Authorization", "Bearer fake-token");
  }

  beforeEach(async () => {
    mockAuthService = { buildContext: jest.fn() };
    barrioRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      existsBySlug: jest.fn(),
    };
    readRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      existsBySlug: jest.fn(),
      existsByOrden: jest.fn(),
    };
    writeRepo = {
      create: jest.fn(),
      updateById: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      addSubcategoria: jest.fn(),
      setSubcategoriaActivo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule, CategoriasModule],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .overrideProvider(CATEGORIA_READ_REPOSITORY)
      .useValue(readRepo)
      .overrideProvider(CATEGORIA_WRITE_REPOSITORY)
      .useValue(writeRepo)
      .overrideProvider(BARRIO_READ_REPOSITORY)
      .useValue(barrioRepo)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());

  describe("POST /categorias", () => {
    it("admin → 201", async () => {
      givenUser("admin");
      writeRepo.create.mockImplementation(async (c) => c);
      readRepo.existsBySlug.mockResolvedValue(false);
      readRepo.existsByOrden.mockResolvedValue(false);

      await authReq("post", "/categorias")
        .send({
          nombre: "Gastronomía",
          slug: "gastronomia",
          icono: "utensils",
          orden: 1,
        })
        .expect(201);
    });

    it("owner → 403", async () => {
      givenUser("owner");
      await authReq("post", "/categorias")
        .send({ nombre: "X", slug: "x", icono: "utensils", orden: 99 })
        .expect(403);
    });

    it("anónimo → 401", async () => {
      await request(app.getHttpServer())
        .post("/categorias")
        .send({ nombre: "X", slug: "x", icono: "utensils", orden: 99 })
        .expect(401);
    });

    it("409 slug duplicado", async () => {
      givenUser("admin");
      readRepo.existsBySlug.mockResolvedValue(true);
      await authReq("post", "/categorias")
        .send({
          nombre: "Gastronomía",
          slug: "gastronomia",
          icono: "utensils",
          orden: 5,
        })
        .expect(409);
    });
  });

  describe("GET /categorias", () => {
    it("público ?activa=true → 200, filtra inactivas y subs inactivas", async () => {
      const cat = makeCat({
        activo: true,
        subcategorias: [
          new Subcategoria({ slug: "s1", nombre: "S1", activo: true }),
          new Subcategoria({ slug: "s2", nombre: "S2", activo: false }),
        ],
      });
      readRepo.list.mockResolvedValue([cat]);

      const res = await request(app.getHttpServer())
        .get("/categorias?activa=true")
        .expect(200);

      expect(res.body[0].subcategorias).toHaveLength(1);
      expect(res.body[0].subcategorias[0].slug).toBe("s1");
      expect(res.body[0].activo).toBeUndefined(); // público no ve flag
    });

    it("admin sin filtro → 200, ve todas con flag activo", async () => {
      givenUser("admin");
      const cat = makeCat({
        activo: false,
        subcategorias: [
          new Subcategoria({ slug: "s1", nombre: "S1", activo: true }),
        ],
      });
      readRepo.list.mockResolvedValue([cat]);

      const res = await authReq("get", "/categorias").expect(200);

      expect(res.body[0].activo).toBe(false);
      expect(res.body[0].subcategorias[0].activo).toBe(true);
    });
  });

  describe("PATCH /categorias/:id", () => {
    it("admin → 200", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(makeCat());
      readRepo.existsByOrden.mockResolvedValue(false);
      writeRepo.updateById.mockImplementation(async (id, p) =>
        makeCat({ ...p }),
      );

      await authReq("patch", "/categorias/g")
        .send({ nombre: "Nuevo" })
        .expect(200);
    });

    it("owner → 403", async () => {
      givenUser("owner");
      await authReq("patch", "/categorias/g").send({ nombre: "X" }).expect(403);
    });

    it("404 si no existe", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(undefined);
      await authReq("patch", "/categorias/nope")
        .send({ nombre: "Nuevo" })
        .expect(404);
    });

    it("409 orden duplicado", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(makeCat());
      readRepo.existsByOrden.mockResolvedValue(true);
      await authReq("patch", "/categorias/g").send({ orden: 2 }).expect(409);
    });
  });

  describe("PATCH /categorias/:id/desactivar", () => {
    it("admin → 200", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(makeCat({ activo: true }));
      writeRepo.deactivate.mockResolvedValue(makeCat({ activo: false }));

      await authReq("patch", "/categorias/g/desactivar").expect(200);
    });
  });

  describe("PATCH /categorias/:id/activar", () => {
    it("admin → 200", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(makeCat({ activo: false }));
      writeRepo.activate.mockResolvedValue(makeCat({ activo: true }));

      await authReq("patch", "/categorias/g/activar").expect(200);
    });
  });

  describe("POST /categorias/:id/subcategorias", () => {
    it("admin → 201", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(makeCat());
      writeRepo.addSubcategoria.mockImplementation(async () =>
        makeCat({
          subcategorias: [
            new Subcategoria({ slug: "s1", nombre: "S1", activo: true }),
          ],
        }),
      );

      const res = await authReq("post", "/categorias/g/subcategorias")
        .send({ slug: "s1", nombre: "S1" })
        .expect(201);

      expect(res.body.subcategorias[0].slug).toBe("s1");
    });

    it("404 categoría no existe", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(undefined);
      await authReq("post", "/categorias/nope/subcategorias")
        .send({ slug: "s1", nombre: "S1" })
        .expect(404);
    });

    it("409 subcategoría duplicada", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(makeCat());
      writeRepo.addSubcategoria.mockRejectedValue(
        new ConflictException("Subcategoría duplicada"),
      );
      await authReq("post", "/categorias/g/subcategorias")
        .send({ slug: "s1", nombre: "S1" })
        .expect(409);
    });
  });

  describe("PATCH /categorias/:id/subcategorias/:subId/desactivar", () => {
    it("admin → 200", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(
        makeCat({
          subcategorias: [
            new Subcategoria({ slug: "s1", nombre: "S1", activo: true }),
          ],
        }),
      );
      writeRepo.setSubcategoriaActivo.mockResolvedValue(
        makeCat({
          subcategorias: [
            new Subcategoria({ slug: "s1", nombre: "S1", activo: false }),
          ],
        }),
      );

      await authReq(
        "patch",
        "/categorias/g/subcategorias/s1/desactivar",
      ).expect(200);
    });
  });
});
