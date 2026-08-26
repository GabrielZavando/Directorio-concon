/**
 * Unit tests for EventosController.
 *
 * Mocks EventosService to test HTTP layer without real service logic.
 *
 * auth-usuarios (Task 12): `create`/`update`/`remove` now use
 * `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('owner', 'admin')` —
 * `usuarioId` and `rol` are extracted from `@CurrentUser()` (replaces the
 * legacy `x-usuario-id` / `x-rol` headers). GET endpoints stay
 * unauthenticated (anonymous discovery).
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
import { EventosController } from "./eventos.controller";
import { EventosService } from "../application/eventos.service";
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
// Mock EventosService
// ---------------------------------------------------------------------------
const mockEventosService = {
  create: jest.fn(),
  findAllPublic: jest.fn(),
  findOnePublic: jest.fn(),
  findBySlugPublic: jest.fn(),
  listMapData: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

function makeEvento(overrides: Record<string, unknown> = {}) {
  return {
    id: "evento-1",
    nombre: "Feria Gastronómica",
    slug: "feria-gastronomica",
    descripcionCorta: "Degustación de platos típicos",
    descripcion:
      "Una feria con más de 30 stands de comida típica de la región.",
    categoriaId: "eventos",
    subcategoriaId: "ferias-gastronomicas",
    barrioId: "centro",
    organizador: "Municipalidad de Concón",
    organizadorContacto: "cultura@concon.cl",
    organizadorWeb: "https://culturaconcon.cl",
    ubicacionNombre: "Plaza de Concón",
    ubicacionDireccion: "Av. Concón 123",
    coordenadas: { lat: -32.92, lng: -71.51 },
    fechaInicio: "2026-08-15T10:00:00.000Z",
    fechaFin: "2026-08-17T22:00:00.000Z",
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    capacidadMaxima: 500,
    publicoObjetivo: ["familia"],
    nivelRuido: "medio",
    portada: "https://storage.example.com/feria.jpg",
    accesibilidad: ["acceso-silla-de-ruedas"],
    status: "aprobado",
    estado: "programado",
    destacado: false,
    verificado: false,
    usuarioId: "user-abc",
    vistasTotales: 0,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
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

// Valid POST /eventos body (accepted by CreateEventoDto).
const validCreateBody = {
  nombre: "Feria Gastronómica",
  descripcionCorta: "Degustación de platos típicos",
  descripcion: "Una feria con más de 30 stands de comida típica de la región.",
  subcategoriaId: "ferias-gastronomicas",
  barrioId: "centro",
  organizador: "Municipalidad de Concón",
  ubicacionDireccion: "Av. Concón 123",
  coordenadas: { lat: -32.92, lng: -71.51 },
  fechaInicio: "2026-08-15T10:00:00.000Z",
  fechaFin: "2026-08-17T22:00:00.000Z",
  precioTipo: "gratis",
  precioValor: 0,
  publicoObjetivo: ["familia"],
  nivelRuido: "medio",
};

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
describe("EventosController (HTTP)", () => {
  let app: INestApplication;
  let mockAuthService: { buildContext: jest.Mock };
  let moduleRef: TestingModule;

  beforeAll(async () => {
    mockAuthService = { buildContext: jest.fn() };

    moduleRef = await Test.createTestingModule({
      imports: [FirebaseModule, AuthModule],
      controllers: [EventosController],
      providers: [{ provide: EventosService, useValue: mockEventosService }],
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

  // =========================================================================
  // POST /eventos (auth: @Roles('owner', 'admin'))
  // =========================================================================
  describe("POST /eventos", () => {
    it("owner → 201, usuarioId === token.uid", async () => {
      const ctx = givenUser("owner");
      const evento = makeEvento({ usuarioId: ctx.uid });
      mockEventosService.create.mockResolvedValue(evento);

      const response = await request(app.getHttpServer())
        .post("/eventos")
        .set("Authorization", "Bearer fake-token")
        .send(validCreateBody)
        .expect(201);

      expect(response.body.id).toBe("evento-1");
      // usuarioId must come from the verified token, NOT any header.
      expect(mockEventosService.create).toHaveBeenCalledWith(
        expect.any(Object),
        ctx.uid,
      );
    });

    it("owner → 201 even with spoofed x-usuario-id header (ignored)", async () => {
      const ctx = givenUser("owner");
      const evento = makeEvento({ usuarioId: ctx.uid });
      mockEventosService.create.mockResolvedValue(evento);

      await request(app.getHttpServer())
        .post("/eventos")
        .set("Authorization", "Bearer fake-token")
        .set("x-usuario-id", "uid-spoofed")
        .send(validCreateBody)
        .expect(201);

      // The legacy header must be ignored: uid comes from the JWT context.
      expect(mockEventosService.create).toHaveBeenCalledWith(
        expect.any(Object),
        ctx.uid,
      );
    });

    it("admin → 201", async () => {
      const ctx = givenUser("admin");
      const evento = makeEvento({ usuarioId: ctx.uid });
      mockEventosService.create.mockResolvedValue(evento);

      const response = await request(app.getHttpServer())
        .post("/eventos")
        .set("Authorization", "Bearer fake-token")
        .send(validCreateBody)
        .expect(201);

      expect(response.body.id).toBe("evento-1");
      expect(mockEventosService.create).toHaveBeenCalledWith(
        expect.any(Object),
        ctx.uid,
      );
    });

    it("member → 403 (RolesGuard — members cannot publish events)", async () => {
      givenUser("member");

      await request(app.getHttpServer())
        .post("/eventos")
        .set("Authorization", "Bearer fake-token")
        .send(validCreateBody)
        .expect(403);

      expect(mockEventosService.create).not.toHaveBeenCalled();
    });

    it("anonymous (no token) → 401", async () => {
      await request(app.getHttpServer())
        .post("/eventos")
        .send(validCreateBody)
        .expect(401);

      expect(mockEventosService.create).not.toHaveBeenCalled();
    });

    it("returns 400 on missing required fields", async () => {
      givenUser("owner");

      await request(app.getHttpServer())
        .post("/eventos")
        .set("Authorization", "Bearer fake-token")
        .send({ nombre: "Test" })
        .expect(400);
    });

    it("returns 409 on duplicate slug", async () => {
      givenUser("owner");
      mockEventosService.create.mockRejectedValue(
        new ConflictException("Slug duplicado"),
      );

      await request(app.getHttpServer())
        .post("/eventos")
        .set("Authorization", "Bearer fake-token")
        .send(validCreateBody)
        .expect(409);
    });
  });

  // =========================================================================
  // GET /eventos (public, no guards)
  // =========================================================================
  describe("GET /eventos", () => {
    it("returns paginated results", async () => {
      mockEventosService.findAllPublic.mockResolvedValue({
        data: [makeEvento()],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get("/eventos")
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it("passes query params to service", async () => {
      mockEventosService.findAllPublic.mockResolvedValue({
        data: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get(
          "/eventos?subcategoriaId=conciertos-y-shows&barrioId=centro&q=jazz&page=1&limit=10",
        )
        .expect(200);

      expect(mockEventosService.findAllPublic).toHaveBeenCalledWith({
        subcategoriaId: "conciertos-y-shows",
        barrioId: "centro",
        q: "jazz",
        page: 1,
        limit: 10,
      });
    });
  });

  // =========================================================================
  // GET /eventos/map-data (public, no guards)
  // =========================================================================
  describe("GET /eventos/map-data", () => {
    it("returns map data array", async () => {
      mockEventosService.listMapData.mockResolvedValue([
        {
          id: "e1",
          nombre: "Evento 1",
          slug: "evento-1",
          coordenadas: { lat: -32.92, lng: -71.51 },
          categoriaId: "eventos",
          fechaInicio: new Date("2026-08-15"),
        },
      ]);

      const response = await request(app.getHttpServer())
        .get("/eventos/map-data")
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].coordenadas).toBeDefined();
    });
  });

  // =========================================================================
  // GET /eventos/slug/:slug (public, no guards)
  // =========================================================================
  describe("GET /eventos/slug/:slug", () => {
    it("returns evento by slug", async () => {
      mockEventosService.findBySlugPublic.mockResolvedValue(makeEvento());

      const response = await request(app.getHttpServer())
        .get("/eventos/slug/feria-gastronomica")
        .expect(200);

      expect(response.body.slug).toBe("feria-gastronomica");
    });

    it("returns 404 when slug not found", async () => {
      mockEventosService.findBySlugPublic.mockRejectedValue(
        new NotFoundException("Evento con slug 'no-existe' no encontrado"),
      );

      await request(app.getHttpServer())
        .get("/eventos/slug/no-existe")
        .expect(404);
    });
  });

  // =========================================================================
  // GET /eventos/:id (public, no guards)
  // =========================================================================
  describe("GET /eventos/:id", () => {
    it("returns evento by id (public)", async () => {
      mockEventosService.findOnePublic.mockResolvedValue(makeEvento());

      const response = await request(app.getHttpServer())
        .get("/eventos/evento-1")
        .expect(200);

      expect(response.body.id).toBe("evento-1");
    });

    it("returns 404 when id not found (public)", async () => {
      mockEventosService.findOnePublic.mockRejectedValue(
        new NotFoundException("Evento no-existe no encontrado"),
      );

      await request(app.getHttpServer())
        .get("/eventos/non-existent")
        .expect(404);
    });
  });

  // =========================================================================
  // PUT /eventos/:id (auth: @Roles('owner', 'admin'))
  // =========================================================================
  describe("PUT /eventos/:id", () => {
    it("owner → 200, update called with uid + rol from context", async () => {
      const ctx = givenUser("owner");
      const updated = makeEvento({ organizador: "Nuevo Organizador" });
      mockEventosService.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .send({ organizador: "Nuevo Organizador" })
        .expect(200);

      expect(response.body.organizador).toBe("Nuevo Organizador");
      expect(mockEventosService.update).toHaveBeenCalledWith(
        "evento-1",
        expect.objectContaining({ organizador: "Nuevo Organizador" }),
        ctx.uid,
        "owner",
      );
    });

    it("owner updating another's evento → 403 (service ownership rule)", async () => {
      givenUser("owner");
      mockEventosService.update.mockRejectedValue(
        new ForbiddenException("No tienes permiso para modificar este evento"),
      );

      await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .send({ organizador: "Otro Organizador" })
        .expect(403);
    });

    it("admin updating another's evento → 200", async () => {
      const ctx = givenUser("admin");
      const updated = makeEvento({ organizador: "Nuevo Organizador" });
      mockEventosService.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .send({ organizador: "Nuevo Organizador" })
        .expect(200);

      expect(response.body.organizador).toBe("Nuevo Organizador");
      expect(mockEventosService.update).toHaveBeenCalledWith(
        "evento-1",
        expect.objectContaining({ organizador: "Nuevo Organizador" }),
        ctx.uid,
        "admin",
      );
    });

    it("member → 403 (RolesGuard)", async () => {
      givenUser("member");

      await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .send({ organizador: "Nuevo" })
        .expect(403);

      expect(mockEventosService.update).not.toHaveBeenCalled();
    });

    it("anonymous (no token) → 401", async () => {
      await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .send({ organizador: "Nuevo" })
        .expect(401);
    });

    it("returns 404 for non-existent evento", async () => {
      givenUser("owner");
      mockEventosService.update.mockRejectedValue(
        new NotFoundException("Evento no-existe no encontrado"),
      );

      await request(app.getHttpServer())
        .put("/eventos/non-existent")
        .set("Authorization", "Bearer fake-token")
        .send({ organizador: "Nuevo" })
        .expect(404);
    });

    it("returns 409 on slug duplicate when renaming", async () => {
      givenUser("owner");
      mockEventosService.update.mockRejectedValue(
        new ConflictException("Slug duplicado"),
      );

      await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .send({ nombre: "Otra Feria" })
        .expect(409);
    });
  });

  // =========================================================================
  // DELETE /eventos/:id (auth: @Roles('owner', 'admin'))
  // =========================================================================
  describe("DELETE /eventos/:id", () => {
    it("owner → 200, remove called with uid + rol from context", async () => {
      const ctx = givenUser("owner");
      mockEventosService.remove.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .expect(200);

      expect(response.body.deleted).toBe(true);
      expect(response.body.id).toBe("evento-1");
      expect(mockEventosService.remove).toHaveBeenCalledWith(
        "evento-1",
        ctx.uid,
        "owner",
      );
    });

    it("admin → 200", async () => {
      const ctx = givenUser("admin");
      mockEventosService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .expect(200);

      expect(mockEventosService.remove).toHaveBeenCalledWith(
        "evento-1",
        ctx.uid,
        "admin",
      );
    });

    it("member → 403 (RolesGuard)", async () => {
      givenUser("member");

      await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .expect(403);

      expect(mockEventosService.remove).not.toHaveBeenCalled();
    });

    it("anonymous (no token) → 401", async () => {
      await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .expect(401);
    });

    it("owner deleting another's evento → 403 (service ownership rule)", async () => {
      givenUser("owner");
      mockEventosService.remove.mockRejectedValue(
        new ForbiddenException("No tienes permiso para eliminar este evento"),
      );

      await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .expect(403);
    });

    it("returns 404 for non-existent evento", async () => {
      givenUser("owner");
      mockEventosService.remove.mockRejectedValue(
        new NotFoundException("Evento no-existe no encontrado"),
      );

      await request(app.getHttpServer())
        .delete("/eventos/non-existent")
        .set("Authorization", "Bearer fake-token")
        .expect(404);
    });

    it("returns 409 when solicitudes exist", async () => {
      givenUser("owner");
      mockEventosService.remove.mockRejectedValue(
        new ConflictException(
          "No se puede eliminar: existen solicitudes pendientes asociadas a este evento",
        ),
      );

      await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .expect(409);
    });
  });
});
