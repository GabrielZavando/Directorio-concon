/**
 * E2E tests for BarriosController.
 *
 * Mocks the repositories and AuthService.buildContext — the guards
 * (JwtAuthGuard, RolesGuard) run for real so the 401/403 authorization
 * contracts are exercised.
 */
import { Test, type TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { BarriosModule } from "../barrios.module";
import { FirebaseModule } from "@/common/modules/firebase.module";
import { AuthService } from "../../auth/application/auth.service";
import { BARRIO_READ_REPOSITORY } from "../domain/barrio-read-repository.interface";
import { BARRIO_WRITE_REPOSITORY } from "../domain/barrio-write-repository.interface";
import { Barrio } from "../domain/barrio.entity";
import type { AuthContext } from "../../auth/domain/auth-context.interface";
import type { Rol } from "../../auth/domain/rol.enum";

// Mock FirebaseService so firebase-admin ESM deps never load in jest.
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

describe("BarriosController (E2E)", () => {
  let app: INestApplication;
  let mockAuthService: { buildContext: jest.Mock };
  let readRepo: jest.Mocked<{
    findById: jest.Mock;
    findBySlug: jest.Mock;
    list: jest.Mock;
    existsBySlug: jest.Mock;
  }>;
  let writeRepo: jest.Mocked<{
    create: jest.Mock;
    updateById: jest.Mock;
    activate: jest.Mock;
    deactivate: jest.Mock;
  }>;

  function makeContext(rol: Rol): AuthContext {
    return { uid: `uid-${rol}-001`, email: `${rol}@example.com`, rol };
  }

  function givenUser(rol: Rol): AuthContext {
    const ctx = makeContext(rol);
    mockAuthService.buildContext.mockResolvedValue(ctx);
    return ctx;
  }

  function makeBarrio(
    overrides: Partial<ConstructorParameters<typeof Barrio>[0]> = {},
  ) {
    return new Barrio({
      id: "higuerillas",
      nombre: "Higuerillas",
      slug: "higuerillas",
      tipo: "urbano",
      ...overrides,
    });
  }

  beforeEach(async () => {
    mockAuthService = { buildContext: jest.fn() };
    readRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      existsBySlug: jest.fn(),
    };
    writeRepo = {
      create: jest.fn(),
      updateById: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule, BarriosModule],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .overrideProvider(BARRIO_READ_REPOSITORY)
      .useValue(readRepo)
      .overrideProvider(BARRIO_WRITE_REPOSITORY)
      .useValue(writeRepo)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // POST /barrios
  // ---------------------------------------------------------------------------

  describe("POST /barrios", () => {
    it("admin → 201", async () => {
      givenUser("admin");
      readRepo.existsBySlug.mockResolvedValue(false);
      writeRepo.create.mockImplementation(async (b) => b);

      await request(app.getHttpServer())
        .post("/barrios")
        .set("Authorization", "Bearer fake-token")
        .send({
          nombre: "Higuerillas",
          slug: "higuerillas",
          tipo: "urbano",
          descripcion: "Zona costera",
          coordenadas: "-33.0,-71.5",
        })
        .expect(201);
    });

    it("owner → 403", async () => {
      givenUser("owner");
      await request(app.getHttpServer())
        .post("/barrios")
        .set("Authorization", "Bearer fake-token")
        .send({ nombre: "X", slug: "x", tipo: "urbano" })
        .expect(403);
    });

    it("anónimo → 401", async () => {
      await request(app.getHttpServer())
        .post("/barrios")
        .send({ nombre: "X", slug: "x", tipo: "urbano" })
        .expect(401);
    });

    it("409 slug duplicado", async () => {
      givenUser("admin");
      readRepo.existsBySlug.mockResolvedValue(true);
      await request(app.getHttpServer())
        .post("/barrios")
        .set("Authorization", "Bearer fake-token")
        .send({ nombre: "Higuerillas", slug: "higuerillas", tipo: "urbano" })
        .expect(409);
    });

    it("400 payload inválido (tipo fuera de enum)", async () => {
      givenUser("admin");
      await request(app.getHttpServer())
        .post("/barrios")
        .set("Authorization", "Bearer fake-token")
        .send({
          nombre: "Higuerillas",
          slug: "higuerillas",
          tipo: "industrial",
        })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /barrios
  // ---------------------------------------------------------------------------

  describe("GET /barrios", () => {
    it("público ?activo=true → 200, filtra inactivos y no expone flag", async () => {
      readRepo.list.mockResolvedValue([makeBarrio({ activo: true })]);

      const res = await request(app.getHttpServer())
        .get("/barrios?activo=true")
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].slug).toBe("higuerillas");
      expect(res.body[0].activo).toBeUndefined();
    });

    it("admin sin filtro → 200, ve todos con flag activo", async () => {
      givenUser("admin");
      readRepo.list.mockResolvedValue([makeBarrio({ activo: true })]);

      const res = await request(app.getHttpServer())
        .get("/barrios")
        .set("Authorization", "Bearer fake-token")
        .expect(200);

      expect(res.body[0].activo).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /barrios/:id
  // ---------------------------------------------------------------------------

  describe("PATCH /barrios/:id", () => {
    it("admin → 200", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(makeBarrio());
      writeRepo.updateById.mockImplementation(
        async (id, p) =>
          new Barrio({
            id,
            nombre: "Higuerillas",
            slug: "higuerillas",
            tipo: "urbano",
            ...p,
          }),
      );

      await request(app.getHttpServer())
        .patch("/barrios/higuerillas")
        .set("Authorization", "Bearer fake-token")
        .send({ nombre: "Higuerillas Norte" })
        .expect(200);
    });

    it("owner → 403", async () => {
      givenUser("owner");
      await request(app.getHttpServer())
        .patch("/barrios/higuerillas")
        .set("Authorization", "Bearer fake-token")
        .send({ nombre: "X" })
        .expect(403);
    });

    it("404 si no existe", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .patch("/barrios/nope")
        .set("Authorization", "Bearer fake-token")
        .send({ nombre: "Nuevo" })
        .expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /barrios/:id/desactivar | /activar
  // ---------------------------------------------------------------------------

  describe("PATCH /barrios/:id/desactivar", () => {
    it("admin → 200", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(makeBarrio());
      writeRepo.deactivate.mockResolvedValue(makeBarrio({ activo: false }));

      await request(app.getHttpServer())
        .patch("/barrios/higuerillas/desactivar")
        .set("Authorization", "Bearer fake-token")
        .expect(200);
    });
  });

  describe("PATCH /barrios/:id/activar", () => {
    it("admin → 200", async () => {
      givenUser("admin");
      readRepo.findById.mockResolvedValue(makeBarrio({ activo: false }));
      writeRepo.activate.mockResolvedValue(makeBarrio({ activo: true }));

      await request(app.getHttpServer())
        .patch("/barrios/higuerillas/activar")
        .set("Authorization", "Bearer fake-token")
        .expect(200);
    });
  });
});
