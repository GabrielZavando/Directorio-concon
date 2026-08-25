/**
 * Unit tests for UsuariosController (HTTP layer).
 *
 * Mocks `UsuariosService` (no real DB / business logic). Verifies the HTTP
 * surface: routing, status codes, DTO application, validation pipe behaviour
 * (`forbidNonWhitelisted`), and the `@Roles(...)` metadata attached to each
 * operation.
 *
 * `JwtAuthGuard` / `RolesGuard` are REPLACED WITH NO-OP MOCKS in the
 * testing module — the real guards are wired only at runtime via
 * `AuthModule` providers. The full e2e guard integration is covered by
 * Task 14's canonical scenarios spec. The behaviour "method X requires
 * rol Y" is verified via `Reflector.getMetadata(ROLES_KEY, ...)` here,
 * and the runtime guard contract lives in the dedicated
 * `jwt-auth.guard.spec.ts` / `roles.guard.spec.ts`.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "../application/usuarios.service";
import { ROLES_KEY } from "../../auth/application/roles.decorator";
import { JwtAuthGuard } from "../../auth/application/jwt-auth.guard";
import { RolesGuard } from "../../auth/application/roles.guard";
import type { AuthContext } from "../../auth/domain/auth-context.interface";

// Mock the FirebaseService MODULE so `firebase-admin`'s ESM-only deps
// (jose/jwks-rsa) are never loaded by jest. Required because importing
// `UsuariosController` pulls in `JwtAuthGuard` (real in Task 7) which
// imports `AuthService` which imports the `FirebaseService` class.
// Matches the pattern in `auth.service.spec.ts` and
// `usuarios-firestore.adapter.spec.ts`.
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

// ---------------------------------------------------------------------------
// Mock UsuariosService — LSP-style mock of the service surface
// ---------------------------------------------------------------------------
const mockUsuariosService = {
  getMe: jest.fn(),
  updatePerfil: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  updateRol: jest.fn(),
};

function makeUsuario(overrides: Record<string, unknown> = {}) {
  return {
    id: "uid-owner-001",
    email: "owner@example.com",
    nombre: "Owner One",
    rol: "owner",
    telefono: "+56912345678",
    createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
describe("UsuariosController (HTTP)", () => {
  let app: INestApplication;
  let reflector: Reflector;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        { provide: UsuariosService, useValue: mockUsuariosService },
        Reflector,
      ],
    })
      // Replace the real guards with no-op mocks. The controller's
      // `@UseGuards(JwtAuthGuard, RolesGuard)` resolves them via DI, but
      // for this HTTP-layer spec we are NOT exercising the guard
      // contract — that lives in `jwt-auth.guard.spec.ts` /
      // `roles.guard.spec.ts` + the Task 14 e2e. The `app.use` middleware
      // below simulates what `JwtAuthGuard` would have done: populating
      // `request.user = AuthContext`.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    reflector = module.get(Reflector);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    // The real `JwtAuthGuard` (Task 7) populates `request.user` after
    // verifying the Firebase idToken. We simulate that in the testing
    // module by injecting a fixed `AuthContext` matching the test user.
    app.use((req: { user?: AuthContext }, _res: unknown, next: () => void) => {
      req.user = {
        uid: "uid-owner-001",
        email: "owner@example.com",
        rol: "owner",
        placeId: "restaurante-el-marino",
      } as AuthContext;
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // GET /usuarios/me — any authenticated role
  // =========================================================================
  describe("GET /usuarios/me", () => {
    it("returns the caller's own perfil (200)", async () => {
      mockUsuariosService.getMe.mockResolvedValue(makeUsuario());

      const res = await request(app.getHttpServer()).get("/usuarios/me");

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("owner@example.com");
      expect(mockUsuariosService.getMe).toHaveBeenCalledWith("uid-owner-001");
    });

    it("decorates with no @Roles metadata (any authenticated role passes)", () => {
      const handler = reflector.get(
        ROLES_KEY,
        UsuariosController.prototype.getMe,
      );
      expect(handler).toBeUndefined();
    });
  });

  // =========================================================================
  // PUT /usuarios/me — any authenticated role (self-service)
  // =========================================================================
  describe("PUT /usuarios/me", () => {
    it("accepts { nombre, telefono } (200)", async () => {
      mockUsuariosService.updatePerfil.mockResolvedValue(
        makeUsuario({ nombre: "Renamed", telefono: "+56900000000" }),
      );

      const res = await request(app.getHttpServer())
        .put("/usuarios/me")
        .send({ nombre: "Renamed", telefono: "+56900000000" });

      expect(res.status).toBe(200);
      expect(mockUsuariosService.updatePerfil).toHaveBeenCalledWith(
        "uid-owner-001",
        { nombre: "Renamed", telefono: "+56900000000" },
      );
    });

    it("rejects 'rol' in the body with 400 (forbidNonWhitelisted)", async () => {
      const res = await request(app.getHttpServer())
        .put("/usuarios/me")
        .send({ nombre: "X", rol: "admin" });

      expect(res.status).toBe(400);
      expect(mockUsuariosService.updatePerfil).not.toHaveBeenCalled();
    });

    it("decorates with no @Roles metadata", () => {
      const handler = reflector.get(
        ROLES_KEY,
        UsuariosController.prototype.updatePerfilMe,
      );
      expect(handler).toBeUndefined();
    });
  });

  // =========================================================================
  // GET /usuarios — admin-only
  // =========================================================================
  describe("GET /usuarios", () => {
    it("returns the paginated list (200)", async () => {
      mockUsuariosService.findAll.mockResolvedValue({
        data: [makeUsuario()],
        total: 1,
      });

      const res = await request(app.getHttpServer()).get("/usuarios");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("decorates with @Roles('admin')", () => {
      const handler = reflector.get(
        ROLES_KEY,
        UsuariosController.prototype.findAll,
      );
      expect(handler).toEqual(["admin"]);
    });
  });

  // =========================================================================
  // POST /usuarios — REMOVED (change auth-usuarios-v2, CH-02)
  // Provisioning now happens via the public `POST /auth/registro` endpoint.
  // =========================================================================
  describe("POST /usuarios (removed)", () => {
    it("returns 404 — the route no longer exists", async () => {
      const res = await request(app.getHttpServer()).post("/usuarios").send({
        id: "uid-new",
        email: "new@example.com",
        nombre: "New User",
      });

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // GET /usuarios/:uid — admin-only
  // =========================================================================
  describe("GET /usuarios/:uid", () => {
    it("returns the usuario by uid (200)", async () => {
      mockUsuariosService.findById.mockResolvedValue(
        makeUsuario({ id: "uid-x" }),
      );

      const res = await request(app.getHttpServer()).get("/usuarios/uid-x");

      expect(res.status).toBe(200);
      expect(mockUsuariosService.findById).toHaveBeenCalledWith("uid-x");
    });

    it("decorates with @Roles('admin')", () => {
      const handler = reflector.get(
        ROLES_KEY,
        UsuariosController.prototype.findOne,
      );
      expect(handler).toEqual(["admin"]);
    });
  });

  // =========================================================================
  // PUT /usuarios/:uid/rol — admin-only, validates restricted enum
  // `[admin, member]` (change auth-usuarios-v2: 'owner' is NOT assignable)
  // =========================================================================
  describe("PUT /usuarios/:uid/rol", () => {
    it("updates the rol (200)", async () => {
      mockUsuariosService.updateRol.mockResolvedValue(
        makeUsuario({ rol: "member" }),
      );

      const res = await request(app.getHttpServer())
        .put("/usuarios/uid-x/rol")
        .send({ rol: "member" });

      expect(res.status).toBe(200);
      expect(mockUsuariosService.updateRol).toHaveBeenCalledWith(
        "uid-x",
        "member",
      );
    });

    it("rejects 'owner' as target (400 — acquired only via self-registration)", async () => {
      const res = await request(app.getHttpServer())
        .put("/usuarios/uid-x/rol")
        .send({ rol: "owner" });

      expect(res.status).toBe(400);
      expect(mockUsuariosService.updateRol).not.toHaveBeenCalled();
    });

    it("rejects 'superuser' (400 from @IsEnum)", async () => {
      const res = await request(app.getHttpServer())
        .put("/usuarios/uid-x/rol")
        .send({ rol: "superuser" });

      expect(res.status).toBe(400);
      expect(mockUsuariosService.updateRol).not.toHaveBeenCalled();
    });

    it("rejects missing rol (400)", async () => {
      const res = await request(app.getHttpServer())
        .put("/usuarios/uid-x/rol")
        .send({});

      expect(res.status).toBe(400);
      expect(mockUsuariosService.updateRol).not.toHaveBeenCalled();
    });

    it("rejects unknown field in body (400, forbidNonWhitelisted)", async () => {
      const res = await request(app.getHttpServer())
        .put("/usuarios/uid-x/rol")
        .send({ rol: "admin", unexpected: true });

      expect(res.status).toBe(400);
      expect(mockUsuariosService.updateRol).not.toHaveBeenCalled();
    });

    it("decorates with @Roles('admin')", () => {
      const handler = reflector.get(
        ROLES_KEY,
        UsuariosController.prototype.updateRol,
      );
      expect(handler).toEqual(["admin"]);
    });
  });
});
