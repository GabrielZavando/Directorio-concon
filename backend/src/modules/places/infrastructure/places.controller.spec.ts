/**
 * Unit tests for PlacesController.
 *
 * Mocks PlacesService to test HTTP layer without real service logic.
 *
 * auth-usuarios (Task 11): `POST /places` now uses `@UseGuards(JwtAuthGuard,
 * RolesGuard)` + `@Roles('owner')` — `usuarioId` is extracted from
 * `@CurrentUser().uid` (replaces the legacy `"anonymous"` hardcode).
 * GET endpoints stay unauthenticated (anonymous discovery Flujo 2).
 * places-auth-fix (Task 2): `PUT /places/:id` and `DELETE /places/:id` now use
 * `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')` and pass
 * the full `AuthContext` to the service (ownership enforced in `PlacesService`).
 * The legacy `"anonymous"` hardcode is gone.
 *
 * Guards run for real so authorization contracts (401/403) are verified.
 * `AuthService.buildContext` is replaced with a per-test mock so Firebase
 * is never called.
 */
import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import request from "supertest";
import { PlacesController } from "./places.controller";
import { PlacesService } from "../application/places.service";
import { AuthModule } from "../../auth/auth.module";
import { AuthService } from "../../auth/application/auth.service";
import { FirebaseModule } from "@/common/modules/firebase.module";
import type { AuthContext } from "../../auth/domain/auth-context.interface";
import type { Rol } from "../../auth/domain/rol.enum";

// Mock the FirebaseService MODULE so `firebase-admin`'s ESM-only deps
// (jose/jwks-rsa) are never loaded by jest.
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

// ---------------------------------------------------------------------------
// Mock PlacesService
// ---------------------------------------------------------------------------
const mockPlacesService = {
  createPlace: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  search: jest.fn(),
  findForMap: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  abiertoAhora: jest.fn(),
};

function makePlace(overrides: Record<string, unknown> = {}) {
  return {
    id: "place-1",
    nombre: "Restaurante El Marino",
    slug: "restaurante-el-marino",
    descripcionCorta: "Mariscos frescos",
    descripcion: "Restaurante familiar especializado en mariscos",
    categoriaId: "gastronomia",
    barrioId: "higuerillas",
    direccion: "Av. Borgoño 123",
    coordenadas: { lat: -33.01, lng: -71.54 },
    imagenes: { galeria: [] },
    planId: "gratuito",
    abierto24x7: false,
    vistasTotales: 0,
    status: "pendiente",
    verificado: false,
    destacado: false,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Auth helpers — per-test user wiring
// ---------------------------------------------------------------------------
function makeContext(rol: Rol): AuthContext {
  return {
    uid: `uid-${rol}-001`,
    email: `${rol}@example.com`,
    rol,
    ...(rol === "owner" ? { placeId: "place-001" } : {}),
  };
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
describe("PlacesController (HTTP)", () => {
  let app: INestApplication;
  let mockAuthService: { buildContext: jest.Mock };
  let moduleRef: TestingModule;

  beforeAll(async () => {
    mockAuthService = { buildContext: jest.fn() };

    moduleRef = await Test.createTestingModule({
      imports: [FirebaseModule, AuthModule],
      controllers: [PlacesController],
      providers: [{ provide: PlacesService, useValue: mockPlacesService }],
    })
      // AuthService replaced with the per-test mock. Guards (JwtAuthGuard,
      // RolesGuard) run for real, exercising the full JWT→Roles contract.
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await moduleRef.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: anonymous — every test that needs auth sets up mockAuthService.
    mockAuthService.buildContext.mockReset();
  });

  function givenUser(rol: Rol): AuthContext {
    const ctx = makeContext(rol);
    mockAuthService.buildContext.mockResolvedValue(ctx);
    return ctx;
  }

  // Sends an authenticated (or anonymous) request to /places/place-1.
  function sendAuthed(
    method: "put" | "delete",
    rol: Rol | null,
    body?: object,
  ) {
    const req = request(app.getHttpServer())[method]("/places/place-1");
    if (rol) {
      req.set("Authorization", "Bearer fake-token");
    }
    if (body !== undefined) {
      req.send(body);
    }
    return req;
  }

  // =========================================================================
  // POST /places (auth: @Roles('owner'))
  // =========================================================================
  describe("POST /places", () => {
    const validBody = {
      nombre: "Restaurante El Marino",
      descripcionCorta: "Mariscos frescos",
      descripcion: "Restaurante familiar especializado en mariscos",
      categoriaId: "gastronomia",
      barrioId: "higuerillas",
      direccion: "Av. Borgoño 123",
      planId: "gratuito",
    };

    // -----------------------------------------------------------------------
    // Happy path — owner creates a place
    // -----------------------------------------------------------------------
    it("owner → 201, usuarioId === ctx.uid", async () => {
      const ctx = givenUser("owner");
      const place = makePlace();
      mockPlacesService.createPlace.mockResolvedValue(place);

      const response = await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-token")
        .send(validBody)
        .expect(201);

      expect(response.body.id).toBe("place-1");
      expect(mockPlacesService.createPlace).toHaveBeenCalledTimes(1);
      // Verify usuarioId was derived from the auth context, not "anonymous".
      expect(mockPlacesService.createPlace).toHaveBeenCalledWith(
        expect.any(Object),
        ctx.uid,
      );
    });

    // -----------------------------------------------------------------------
    // member → 403 (RolesGuard short-circuit — POST /places is owner-only)
    // -----------------------------------------------------------------------
    it("member → 403 (RolesGuard)", async () => {
      givenUser("member");

      await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-token")
        .send(validBody)
        .expect(403);

      expect(mockPlacesService.createPlace).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // admin → 403 (RolesGuard — admin isn't 'owner' per this endpoint)
    // -----------------------------------------------------------------------
    it("admin → 403 (RolesGuard — only owners can create places)", async () => {
      givenUser("admin");

      await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-token")
        .send(validBody)
        .expect(403);

      expect(mockPlacesService.createPlace).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Anónimo → 401 (JwtAuthGuard)
    // -----------------------------------------------------------------------
    it("anónimo (no token) → 401 No Bearer header", async () => {
      await request(app.getHttpServer())
        .post("/places")
        .send(validBody)
        .expect(401);

      expect(mockPlacesService.createPlace).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Duplicate slug (ConflictException)
    // -----------------------------------------------------------------------
    it("returns 409 on duplicate slug", async () => {
      givenUser("owner");
      mockPlacesService.createPlace.mockRejectedValue(
        new ConflictException("Slug duplicado"),
      );

      await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-token")
        .send(validBody)
        .expect(409);
    });

    // -----------------------------------------------------------------------
    // Missing required fields → 400 (ValidationPipe)
    // -----------------------------------------------------------------------
    it("returns 400 on missing required fields", async () => {
      givenUser("owner");

      await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-token")
        .send({ nombre: "Solo nombre" })
        .expect(400);
    });

    // -----------------------------------------------------------------------
    // Body with { usuarioId: 'spoofed' } → 400 (forbidNonWhitelisted)
    // -----------------------------------------------------------------------
    it("body with {usuarioId: 'spoof'} → 400 forbidNonWhitelisted", async () => {
      givenUser("owner");

      await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-token")
        .send({ ...validBody, usuarioId: "spoofed" })
        .expect(400);

      expect(mockPlacesService.createPlace).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // body with unknown field → 400 (forbidNonWhitelisted)
    // -----------------------------------------------------------------------
    it("returns 400 on unknown field", async () => {
      givenUser("owner");

      await request(app.getHttpServer())
        .post("/places")
        .set("Authorization", "Bearer fake-token")
        .send({ ...validBody, campoDesconocido: "sorpresa" })
        .expect(400);
    });
  });

  // =========================================================================
  // GET endpoints — anonymous (no guards, same as master)
  // =========================================================================
  describe("GET /places", () => {
    it("returns paginated results", async () => {
      mockPlacesService.search.mockResolvedValue({
        data: [makePlace()],
        nextCursor: null,
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get("/places")
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      // GET endpoint is unguarded — no Authorization header needed.
    });
  });

  describe("GET /places/slug/:slug", () => {
    it("returns the place", async () => {
      mockPlacesService.findBySlug.mockResolvedValue(makePlace());

      const response = await request(app.getHttpServer())
        .get("/places/slug/restaurante-el-marino")
        .expect(200);

      expect(response.body.slug).toBe("restaurante-el-marino");
    });
  });

  describe("GET /places/map-data", () => {
    it("returns map data", async () => {
      mockPlacesService.findForMap.mockResolvedValue([makePlace()]);

      const response = await request(app.getHttpServer())
        .get("/places/map-data")
        .expect(200);

      expect(response.body).toHaveLength(1);
    });
  });

  describe("GET /places/:id", () => {
    it("returns the place", async () => {
      mockPlacesService.findById.mockResolvedValue(makePlace());

      const response = await request(app.getHttpServer())
        .get("/places/place-1")
        .expect(200);

      expect(response.body.id).toBe("place-1");
    });

    it("returns 404 on unknown id", async () => {
      mockPlacesService.findById.mockRejectedValue(
        new NotFoundException("Not found"),
      );

      await request(app.getHttpServer()).get("/places/unknown").expect(404);
    });
  });

  describe("GET /places/:id/abierto-ahora", () => {
    it("returns the place open status", async () => {
      mockPlacesService.abiertoAhora.mockResolvedValue(makePlace());

      const response = await request(app.getHttpServer())
        .get("/places/place-1/abierto-ahora")
        .expect(200);

      expect(response.body.id).toBe("place-1");
    });
  });

  // =========================================================================
  // PUT /places/:id and DELETE /places/:id
  // (auth: @Roles('owner','admin') + service ownership in PlacesService)
  // =========================================================================
  function serviceFor(method: "put" | "delete") {
    return method === "put"
      ? mockPlacesService.update
      : mockPlacesService.delete;
  }

  describe.each([
    ["PUT /places/:id", "put", { nombre: "Nuevo" }] as const,
    ["DELETE /places/:id", "delete", undefined] as const,
  ])("%s", (_label, method, body) => {
    it("owner (own place) → 200, passes ctx to service", async () => {
      const ctx = givenUser("owner");
      mockPlacesService.update.mockResolvedValue(makePlace());
      mockPlacesService.delete.mockResolvedValue(undefined);

      await sendAuthed(method, "owner", body).expect(200);

      const expectedArgs =
        method === "put"
          ? [
              "place-1",
              expect.any(Object),
              expect.objectContaining({ uid: ctx.uid, rol: "owner" }),
            ]
          : [
              "place-1",
              expect.objectContaining({ uid: ctx.uid, rol: "owner" }),
            ];
      expect(serviceFor(method)).toHaveBeenCalledWith(...expectedArgs);
    });

    it("owner (foreign place) → 403 (service ownership)", async () => {
      givenUser("owner");
      serviceFor(method).mockRejectedValue(
        method === "put"
          ? new ForbiddenException(
              "No tienes permiso para modificar este lugar",
            )
          : new ForbiddenException(
              "No tienes permiso para eliminar este lugar",
            ),
      );

      await sendAuthed(method, "owner", body).expect(403);
    });

    it("admin (any place) → 200, passes ctx to service", async () => {
      const ctx = givenUser("admin");
      mockPlacesService.update.mockResolvedValue(makePlace());
      mockPlacesService.delete.mockResolvedValue(undefined);

      await sendAuthed(method, "admin", body).expect(200);

      const expectedArgs =
        method === "put"
          ? [
              "place-1",
              expect.any(Object),
              expect.objectContaining({ uid: ctx.uid, rol: "admin" }),
            ]
          : [
              "place-1",
              expect.objectContaining({ uid: ctx.uid, rol: "admin" }),
            ];
      expect(serviceFor(method)).toHaveBeenCalledWith(...expectedArgs);
    });

    it("member → 403 (RolesGuard)", async () => {
      givenUser("member");

      await sendAuthed(method, "member", body).expect(403);

      expect(serviceFor(method)).not.toHaveBeenCalled();
    });

    it("anónimo (no token) → 401 (JwtAuthGuard)", async () => {
      await sendAuthed(method, null, body).expect(401);

      expect(serviceFor(method)).not.toHaveBeenCalled();
    });
  });
});
