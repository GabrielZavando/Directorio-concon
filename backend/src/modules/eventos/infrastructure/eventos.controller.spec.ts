/**
 * Unit tests for EventosController.
 *
 * Mocks EventosService to test HTTP layer without real service logic.
 *
 * Authorization contracts (401/403) are verified via real guards (JwtAuthGuard,
 * RolesGuard). The soft-delete and verificar endpoints are covered.
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

jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

const mockEventosService = {
  create: jest.fn(),
  findAllPublic: jest.fn(),
  findOnePublic: jest.fn(),
  findBySlugPublic: jest.fn(),
  listMapData: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  verificar: jest.fn(),
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
    ubicacion: {
      nombreLugar: "Plaza de Concón",
      direccion: "Av. Concón 123",
      coordenadas: { lat: -32.92, lng: -71.51 },
    },
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
    estado: "programado",
    destacado: false,
    estadoVerificacion: "verificado",
    activo: true,
    usuarioId: "user-abc",
    vistasTotales: 0,
    cambios: [],
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  };
}

function makeContext(rol: Rol): AuthContext {
  return {
    uid: `uid-${rol}-001`,
    email: `${rol}@example.com`,
    rol,
    ...(rol === "owner" ? { placeId: "place-001" } : {}),
  };
}

const validCreateBody = {
  nombre: "Feria Gastronómica",
  descripcionCorta: "Degustación de platos típicos",
  descripcion: "Una feria con más de 30 stands de comida típica de la región.",
  subcategoriaId: "ferias-gastronomicas",
  barrioId: "centro",
  organizador: "Municipalidad de Concón",
  ubicacion: {
    direccion: "Av. Concón 123",
    coordenadas: { lat: -32.92, lng: -71.51 },
  },
  fechaInicio: "2026-08-15T10:00:00.000Z",
  fechaFin: "2026-08-17T22:00:00.000Z",
  precioTipo: "gratis",
  precioValor: 0,
  publicoObjetivo: ["familia"],
  nivelRuido: "medio",
};

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
    mockAuthService.buildContext.mockReset();
  });

  function givenUser(rol: Rol): AuthContext {
    const ctx = makeContext(rol);
    mockAuthService.buildContext.mockResolvedValue(ctx);
    return ctx;
  }

  // =========================================================================
  // POST /eventos
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

    it("member → 403", async () => {
      givenUser("member");

      await request(app.getHttpServer())
        .post("/eventos")
        .set("Authorization", "Bearer fake-token")
        .send(validCreateBody)
        .expect(403);

      expect(mockEventosService.create).not.toHaveBeenCalled();
    });

    it("anonymous → 401", async () => {
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
  // GET /eventos
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
          "/eventos?subcategoriaId=conciertos-y-shows&barrioId=centro&q=jazz&destacado=true&page=1&limit=10",
        )
        .expect(200);

      expect(mockEventosService.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          subcategoriaId: "conciertos-y-shows",
          barrioId: "centro",
          q: "jazz",
          destacado: true,
          page: 1,
          limit: 10,
        }),
      );
    });
  });

  // =========================================================================
  // GET /eventos/map-data
  // =========================================================================
  describe("GET /eventos/map-data", () => {
    it("returns map data array", async () => {
      mockEventosService.listMapData.mockResolvedValue([
        {
          id: "e1",
          nombre: "Evento 1",
          slug: "evento-1",
          coordenadas: { lat: -32.92, lng: -71.51 },
          subcategoriaId: "ferias-gastronomicas",
          barrioId: "centro",
          fechaInicio: new Date("2026-08-15"),
        },
      ]);

      const response = await request(app.getHttpServer())
        .get("/eventos/map-data")
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].coordenadas).toBeDefined();
      expect(response.body[0].subcategoriaId).toBe("ferias-gastronomicas");
      expect(response.body[0].barrioId).toBe("centro");
      expect(response.body[0].ubicacion).toBeUndefined();
    });
  });

  // =========================================================================
  // GET /eventos/slug/:slug
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
  // GET /eventos/:id
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
  // PUT /eventos/:id
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

    it("anonymous → 401", async () => {
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
  // POST /eventos/:id/verificar (admin)
  // =========================================================================
  describe("POST /eventos/:id/verificar", () => {
    it("admin → 200, verificar called with resultado + uid", async () => {
      const ctx = givenUser("admin");
      const verified = makeEvento({ estadoVerificacion: "verificado" });
      mockEventosService.verificar.mockResolvedValue(verified);

      const response = await request(app.getHttpServer())
        .post("/eventos/evento-1/verificar")
        .set("Authorization", "Bearer fake-token")
        .send({ resultado: "verificado" })
        .expect(200);

      expect(response.body.estadoVerificacion).toBe("verificado");
      expect(mockEventosService.verificar).toHaveBeenCalledWith(
        "evento-1",
        "verificado",
        ctx.uid,
        undefined,
      );
    });

    it("admin reject requires motivo → 400 (ValidationPipe)", async () => {
      givenUser("admin");

      await request(app.getHttpServer())
        .post("/eventos/evento-1/verificar")
        .set("Authorization", "Bearer fake-token")
        .send({ resultado: "rechazado" })
        .expect(400);

      expect(mockEventosService.verificar).not.toHaveBeenCalled();
    });

    it("admin reject with motivo → 200", async () => {
      givenUser("admin");
      const rejected = makeEvento({
        estadoVerificacion: "rechazado",
        activo: false,
      });
      mockEventosService.verificar.mockResolvedValue(rejected);

      const response = await request(app.getHttpServer())
        .post("/eventos/evento-1/verificar")
        .set("Authorization", "Bearer fake-token")
        .send({ resultado: "rechazado", motivo: "Falta documentación" })
        .expect(200);

      expect(mockEventosService.verificar).toHaveBeenCalledWith(
        "evento-1",
        "rechazado",
        expect.any(String),
        "Falta documentación",
      );
      expect(response.body.activo).toBe(false);
    });

    it("owner → 403 (RolesGuard)", async () => {
      givenUser("owner");

      await request(app.getHttpServer())
        .post("/eventos/evento-1/verificar")
        .set("Authorization", "Bearer fake-token")
        .send({ resultado: "verificado" })
        .expect(403);

      expect(mockEventosService.verificar).not.toHaveBeenCalled();
    });

    it("anonymous → 401", async () => {
      await request(app.getHttpServer())
        .post("/eventos/evento-1/verificar")
        .send({ resultado: "verificado" })
        .expect(401);
    });
  });

  // =========================================================================
  // DELETE /eventos/:id (soft delete)
  // =========================================================================
  describe("DELETE /eventos/:id", () => {
    it("owner → 200, returns soft-deleted evento", async () => {
      const ctx = givenUser("owner");
      mockEventosService.remove.mockResolvedValue(
        makeEvento({ activo: false }),
      );

      const response = await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("Authorization", "Bearer fake-token")
        .expect(200);

      expect(response.body.activo).toBe(false);
      expect(response.body.id).toBe("evento-1");
      expect(mockEventosService.remove).toHaveBeenCalledWith(
        "evento-1",
        ctx.uid,
        "owner",
      );
    });

    it("admin → 200", async () => {
      const ctx = givenUser("admin");
      mockEventosService.remove.mockResolvedValue(
        makeEvento({ activo: false }),
      );

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

    it("anonymous → 401", async () => {
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
  });
});
