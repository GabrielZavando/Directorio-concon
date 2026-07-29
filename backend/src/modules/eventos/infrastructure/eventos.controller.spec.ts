/**
 * Unit tests for EventosController.
 * Mocks EventosService to test HTTP layer without real service logic.
 */
import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
  ValidationPipe,
} from "@nestjs/common";
import request from "supertest";
import { EventosController } from "./eventos.controller";
import { EventosService } from "../application/eventos.service";

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
// App setup
// ---------------------------------------------------------------------------
describe("EventosController (HTTP)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventosController],
      providers: [{ provide: EventosService, useValue: mockEventosService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // POST /eventos
  // =========================================================================
  describe("POST /eventos", () => {
    it("creates an evento and returns 201", async () => {
      const evento = makeEvento();
      mockEventosService.create.mockResolvedValue(evento);

      const response = await request(app.getHttpServer())
        .post("/eventos")
        .set("x-usuario-id", "user-abc")
        .send({
          nombre: "Feria Gastronómica",
          descripcionCorta: "Degustación de platos típicos",
          descripcion:
            "Una feria con más de 30 stands de comida típica de la región.",
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
        })
        .expect(201);

      expect(response.body.id).toBe("evento-1");
      expect(mockEventosService.create).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Feria Gastronómica" }),
        "user-abc",
      );
    });

    it("returns 400 on missing required fields", async () => {
      await request(app.getHttpServer())
        .post("/eventos")
        .send({ nombre: "Test" })
        .expect(400);
    });

    it("returns 401 when x-usuario-id header is missing", async () => {
      await request(app.getHttpServer())
        .post("/eventos")
        .send({
          nombre: "Feria Gastronómica",
          descripcionCorta: "Degustación de platos típicos",
          descripcion: "Una feria con más de 30 stands de comida típica.",
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
        })
        .expect(401);
    });

    it("returns 409 on duplicate slug", async () => {
      mockEventosService.create.mockRejectedValue(
        new ConflictException("Slug duplicado"),
      );

      await request(app.getHttpServer())
        .post("/eventos")
        .set("x-usuario-id", "user-abc")
        .send({
          nombre: "Feria Gastronómica",
          descripcionCorta: "Degustación de platos típicos",
          descripcion: "Una feria con más de 30 stands de comida típica.",
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
        })
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
    it("updates and returns updated evento", async () => {
      const updated = makeEvento({ organizador: "Nuevo Organizador" });
      mockEventosService.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .set("x-usuario-id", "user-abc")
        .set("x-rol", "empresa")
        .send({ organizador: "Nuevo Organizador" })
        .expect(200);

      expect(response.body.organizador).toBe("Nuevo Organizador");
      expect(mockEventosService.update).toHaveBeenCalledWith(
        "evento-1",
        expect.objectContaining({ organizador: "Nuevo Organizador" }),
        "user-abc",
        "empresa",
      );
    });

    it("returns 401 when x-usuario-id header is missing", async () => {
      await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .send({ organizador: "Nuevo" })
        .expect(401);
    });

    it("returns 403 when user is not owner", async () => {
      mockEventosService.update.mockRejectedValue(
        new ForbiddenException("No tienes permiso para modificar este evento"),
      );

      await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .set("x-usuario-id", "other-user")
        .set("x-rol", "empresa")
        .send({ organizador: "Otro Organizador" })
        .expect(403);
    });

    it("returns 404 for non-existent evento", async () => {
      mockEventosService.update.mockRejectedValue(
        new NotFoundException("Evento no-existe no encontrado"),
      );

      await request(app.getHttpServer())
        .put("/eventos/non-existent")
        .set("x-usuario-id", "user-abc")
        .set("x-rol", "empresa")
        .send({ organizador: "Nuevo" })
        .expect(404);
    });

    it("defaults rol to empresa when x-rol header is missing", async () => {
      mockEventosService.update.mockResolvedValue(makeEvento());

      await request(app.getHttpServer())
        .put("/eventos/evento-1")
        .set("x-usuario-id", "user-abc")
        .send({ organizador: "Nuevo" })
        .expect(200);

      expect(mockEventosService.update).toHaveBeenCalledWith(
        "evento-1",
        expect.any(Object),
        "user-abc",
        "empresa",
      );
    });
  });

  // =========================================================================
  // DELETE /eventos/:id
  // =========================================================================
  describe("DELETE /eventos/:id", () => {
    it("deletes and returns confirmation", async () => {
      mockEventosService.remove.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("x-usuario-id", "user-abc")
        .set("x-rol", "empresa")
        .expect(200);

      expect(response.body.deleted).toBe(true);
      expect(response.body.id).toBe("evento-1");
    });

    it("returns 401 when x-usuario-id header is missing", async () => {
      await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .expect(401);
    });

    it("returns 403 when user is not owner", async () => {
      mockEventosService.remove.mockRejectedValue(
        new ForbiddenException("No tienes permiso para eliminar este evento"),
      );

      await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("x-usuario-id", "other-user")
        .set("x-rol", "empresa")
        .expect(403);
    });

    it("returns 404 for non-existent evento", async () => {
      mockEventosService.remove.mockRejectedValue(
        new NotFoundException("Evento no-existe no encontrado"),
      );

      await request(app.getHttpServer())
        .delete("/eventos/non-existent")
        .set("x-usuario-id", "user-abc")
        .set("x-rol", "empresa")
        .expect(404);
    });

    it("returns 409 when solicitudes exist", async () => {
      mockEventosService.remove.mockRejectedValue(
        new ConflictException(
          "No se puede eliminar: existen solicitudes pendientes asociadas a este evento",
        ),
      );

      await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("x-usuario-id", "user-abc")
        .set("x-rol", "empresa")
        .expect(409);
    });

    it("defaults rol to empresa when x-rol header is missing", async () => {
      mockEventosService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete("/eventos/evento-1")
        .set("x-usuario-id", "user-abc")
        .expect(200);

      expect(mockEventosService.remove).toHaveBeenCalledWith(
        "evento-1",
        "user-abc",
        "empresa",
      );
    });
  });
});
