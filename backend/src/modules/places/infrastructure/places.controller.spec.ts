/**
 * Unit tests for PlacesController.
 * Mocks PlacesService to test HTTP layer without real service logic.
 */
import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import request from "supertest";
import { PlacesController } from "./places.controller";
import { PlacesService } from "../application/places.service";

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
// App setup
// ---------------------------------------------------------------------------
describe("PlacesController (HTTP)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacesController],
      providers: [{ provide: PlacesService, useValue: mockPlacesService }],
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
  // POST /places
  // =========================================================================
  describe("POST /places", () => {
    it("creates a place and returns 201", async () => {
      const place = makePlace();
      mockPlacesService.createPlace.mockResolvedValue(place);

      const response = await request(app.getHttpServer())
        .post("/places")
        .send({
          nombre: "Restaurante El Marino",
          descripcionCorta: "Mariscos frescos",
          descripcion: "Restaurante familiar especializado en mariscos",
          categoriaId: "gastronomia",
          barrioId: "higuerillas",
          direccion: "Av. Borgoño 123",
          planId: "gratuito",
        })
        .expect(201);

      expect(response.body.id).toBe("place-1");
      expect(mockPlacesService.createPlace).toHaveBeenCalledTimes(1);
    });

    it("returns 409 on duplicate slug", async () => {
      mockPlacesService.createPlace.mockRejectedValue(
        new ConflictException("Slug duplicado"),
      );

      await request(app.getHttpServer())
        .post("/places")
        .send({
          nombre: "Restaurante El Marino",
          descripcionCorta: "Mariscos frescos",
          descripcion: "Restaurante familiar especializado en mariscos",
          categoriaId: "gastronomia",
          barrioId: "higuerillas",
          direccion: "Av. Borgoño 123",
          planId: "gratuito",
        })
        .expect(409);
    });

    it("returns 400 on missing required fields", async () => {
      await request(app.getHttpServer())
        .post("/places")
        .send({ nombre: "Test" })
        .expect(400);
    });
  });

  // =========================================================================
  // GET /places
  // =========================================================================
  describe("GET /places", () => {
    it("returns paginated results", async () => {
      mockPlacesService.search.mockResolvedValue({
        data: [makePlace()],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get("/places")
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it("passes query params to service", async () => {
      mockPlacesService.search.mockResolvedValue({ data: [], total: 0 });

      await request(app.getHttpServer())
        .get(
          "/places?categoriaId=gastronomia&barrioId=centro&q=pizza&page=1&limit=10",
        )
        .expect(200);

      expect(mockPlacesService.search).toHaveBeenCalledWith({
        categoriaId: "gastronomia",
        barrioId: "centro",
        q: "pizza",
        page: 1,
        limit: 10,
      });
    });
  });

  // =========================================================================
  // GET /places/map-data
  // =========================================================================
  describe("GET /places/map-data", () => {
    it("returns map data array", async () => {
      mockPlacesService.findForMap.mockResolvedValue([
        {
          id: "p1",
          nombre: "Place 1",
          slug: "place-1",
          coordenadas: { lat: -33.0, lng: -71.5 },
          categoriaId: "gastronomia",
        },
      ]);

      const response = await request(app.getHttpServer())
        .get("/places/map-data")
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].coordenadas).toBeDefined();
    });
  });

  // =========================================================================
  // GET /places/slug/:slug
  // =========================================================================
  describe("GET /places/slug/:slug", () => {
    it("returns place by slug", async () => {
      mockPlacesService.findBySlug.mockResolvedValue(makePlace());

      const response = await request(app.getHttpServer())
        .get("/places/slug/restaurante-el-marino")
        .expect(200);

      expect(response.body.slug).toBe("restaurante-el-marino");
    });

    it("returns 404 when slug not found", async () => {
      mockPlacesService.findBySlug.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get("/places/slug/non-existent")
        .expect(404);
    });
  });

  // =========================================================================
  // GET /places/:id
  // =========================================================================
  describe("GET /places/:id", () => {
    it("returns place by id", async () => {
      mockPlacesService.findById.mockResolvedValue(makePlace());

      const response = await request(app.getHttpServer())
        .get("/places/place-1")
        .expect(200);

      expect(response.body.id).toBe("place-1");
    });

    it("returns 404 when id not found", async () => {
      mockPlacesService.findById.mockRejectedValue(
        new NotFoundException("Place non-existent no encontrado"),
      );

      await request(app.getHttpServer())
        .get("/places/non-existent")
        .expect(404);
    });
  });

  // =========================================================================
  // GET /places/:id/abierto-ahora
  // =========================================================================
  describe("GET /places/:id/abierto-ahora", () => {
    it("returns open status", async () => {
      mockPlacesService.abiertoAhora.mockResolvedValue({ abierto: true });

      const response = await request(app.getHttpServer())
        .get("/places/place-1/abierto-ahora")
        .expect(200);

      expect(response.body.abierto).toBe(true);
    });

    it("returns 404 for non-existent place", async () => {
      mockPlacesService.abiertoAhora.mockRejectedValue(
        new NotFoundException("Place not found"),
      );

      await request(app.getHttpServer())
        .get("/places/non-existent/abierto-ahora")
        .expect(404);
    });
  });

  // =========================================================================
  // PUT /places/:id
  // =========================================================================
  describe("PUT /places/:id", () => {
    it("updates and returns updated place", async () => {
      const updated = makePlace({ telefono: "+56999999999" });
      mockPlacesService.update.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .put("/places/place-1")
        .send({ telefono: "+56999999999" })
        .expect(200);

      expect(response.body.telefono).toBe("+56999999999");
    });

    it("returns 404 for non-existent place", async () => {
      mockPlacesService.update.mockRejectedValue(
        new NotFoundException("Place not found"),
      );

      await request(app.getHttpServer())
        .put("/places/non-existent")
        .send({ telefono: "+56999999999" })
        .expect(404);
    });
  });

  // =========================================================================
  // DELETE /places/:id
  // =========================================================================
  describe("DELETE /places/:id", () => {
    it("deletes and returns confirmation", async () => {
      mockPlacesService.delete.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete("/places/place-1")
        .expect(200);

      expect(response.body.deleted).toBe(true);
      expect(response.body.id).toBe("place-1");
    });

    it("returns 409 when solicitudes exist", async () => {
      mockPlacesService.delete.mockRejectedValue(
        new ConflictException(
          "No se puede eliminar: existen solicitudes asociadas a este lugar",
        ),
      );

      await request(app.getHttpServer()).delete("/places/place-1").expect(409);
    });

    it("returns 404 for non-existent place", async () => {
      mockPlacesService.delete.mockRejectedValue(
        new NotFoundException("Place not found"),
      );

      await request(app.getHttpServer())
        .delete("/places/non-existent")
        .expect(404);
    });
  });
});
