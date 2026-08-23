/**
 * Unit tests for EventosService.
 * TDD RED phase — these tests will fail until the service is implemented.
 */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { EventosService } from "./eventos.service";
import type { EventoRepositoryInterface } from "../domain/evento-repository.interface";
import type { Evento } from "../domain/evento.entity";
import type { SolicitudesServiceInterface } from "./solicitudes-service.interface";
import { EventoValidator } from "./evento-validator";
import { BadRequestException } from "@nestjs/common";
import type { CatalogValidator } from "../../categorias/application/catalog-validator.service";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------
function createMockValidator(): jest.Mocked<EventoValidator> {
  return {
    validateCreate: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<EventoValidator>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEvento(overrides: Partial<Evento> = {}): Evento {
  return {
    id: "evento-1",
    nombre: "Feria Gastronómica de Concón",
    slug: "feria-gastronomica-de-concon",
    descripcionCorta: "La mejor feria gastronómica del año",
    descripcion:
      "Disfruta de la mejor gastronomía local con más de 50 stands de comida típica.",
    categoriaId: "eventos",
    subcategoriaId: "ferias-gastronomicas",
    barrioId: "centro",
    organizador: "Municipalidad de Concón",
    organizadorContacto: "+56912345678",
    ubicacionDireccion: "Av. Borgoño 1234, Concón",
    coordenadas: { lat: -32.998, lng: -71.518 },
    fechaInicio: new Date("2026-08-15T10:00:00Z"),
    fechaFin: new Date("2026-08-17T22:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "todos"],
    nivelRuido: "alto",
    status: "aprobado",
    estado: "programado",
    destacado: false,
    verificado: false,
    usuarioId: "user-1",
    vistasTotales: 0,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    fechaPublicacion: new Date("2026-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockEventoRepo: jest.Mocked<EventoRepositoryInterface> = {
  create: jest.fn(),
  findAllPublic: jest.fn(),
  findAllAdmin: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  listMapData: jest.fn(),
};

const mockSolicitudService: jest.Mocked<SolicitudesServiceInterface> = {
  createEventoSolicitud: jest.fn(),
  existsPendingByEventoId: jest.fn(),
};

const mockValidator = createMockValidator();

// Mock CatalogValidator — `enabled` toggled per-test; assert* default to
// resolving (valid catalog). Same shape as places.service.spec.ts (8.2/8.4).
type CatalogValidatorMock = {
  enabled: boolean;
  assertCategoriaActiva: jest.Mock<Promise<void>, [string]>;
  assertSubcategoriaActiva: jest.Mock<Promise<void>, [string, string]>;
  assertBarrioActivo: jest.Mock<Promise<void>, [string]>;
};

const mockCatalogValidator: CatalogValidatorMock = {
  enabled: true,
  assertCategoriaActiva: jest.fn().mockResolvedValue(undefined),
  assertSubcategoriaActiva: jest.fn().mockResolvedValue(undefined),
  assertBarrioActivo: jest.fn().mockResolvedValue(undefined),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("EventosService", () => {
  let service: EventosService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidator.validateCreate.mockImplementation(async () => []);
    mockCatalogValidator.enabled = true;
    // clearAllMocks() does NOT reset implementations — restore defaults.
    mockCatalogValidator.assertCategoriaActiva.mockResolvedValue(undefined);
    mockCatalogValidator.assertSubcategoriaActiva.mockResolvedValue(undefined);
    mockCatalogValidator.assertBarrioActivo.mockResolvedValue(undefined);
    service = new EventosService(
      mockEventoRepo,
      mockSolicitudService as unknown as SolicitudesServiceInterface,
      mockValidator,
      mockCatalogValidator as unknown as CatalogValidator,
    );
  });

  // =========================================================================
  // create
  // =========================================================================
  describe("create", () => {
    const createDto = {
      nombre: "Feria Gastronómica de Concón",
      descripcionCorta: "La mejor feria gastronómica del año",
      descripcion:
        "Disfruta de la mejor gastronomía local con más de 50 stands de comida típica.",
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      organizador: "Municipalidad de Concón",
      ubicacionDireccion: "Av. Borgoño 1234, Concón",
      coordenadas: { lat: -32.998, lng: -71.518 },
      fechaInicio: "2026-08-15T10:00:00Z",
      fechaFin: "2026-08-17T22:00:00Z",
      precioTipo: "gratis",
      precioValor: 0,
      precioMoneda: "CLP",
      publicoObjetivo: ["familia", "todos"],
      nivelRuido: "alto",
    };

    beforeEach(() => {
      mockValidator.validateCreate.mockImplementation(async () => []);
    });

    it("creates evento with slug, status pendiente, estado borrador, solicitud", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(null);
      mockEventoRepo.create.mockImplementation(async (data) =>
        makeEvento({
          ...data,
          id: "new-evento",
          createdAt: new Date(),
          updatedAt: new Date(),
          fechaInicio: new Date(data.fechaInicio as unknown as string),
          fechaFin: new Date(data.fechaFin as unknown as string),
        } as unknown as Partial<Evento>),
      );
      mockSolicitudService.createEventoSolicitud.mockResolvedValue({
        id: "sol-new",
      });

      const result = await service.create(createDto, "user-1");

      expect(result.id).toBe("new-evento");
      expect(result.status).toBe("pendiente");
      expect(result.estado).toBe("borrador");
      expect(result.categoriaId).toBe("eventos");
      expect(result.slug).toBe("feria-gastronomica-de-concon");
      expect(result.usuarioId).toBe("user-1");
      expect(result.precioMoneda).toBe("CLP");
      expect(mockEventoRepo.findBySlug).toHaveBeenCalledWith(
        "feria-gastronomica-de-concon",
      );
      expect(mockEventoRepo.create).toHaveBeenCalledTimes(1);
      expect(mockSolicitudService.createEventoSolicitud).toHaveBeenCalledWith(
        expect.objectContaining({
          eventoId: "new-evento",
          usuarioId: "user-1",
          tipo: "registro-evento",
          status: "pendiente",
        }),
      );
    });

    it("throws ConflictException on duplicate slug", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(makeEvento());

      await expect(service.create(createDto, "user-1")).rejects.toThrow(
        ConflictException,
      );
      expect(mockEventoRepo.create).not.toHaveBeenCalled();
      expect(mockSolicitudService.createEventoSolicitud).not.toHaveBeenCalled();
    });

    it("throws UnprocessableEntityException when validation fails", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(null);
      mockValidator.validateCreate.mockImplementation(async () => [
        "Barrio 'centro' no existe",
      ]);

      await expect(service.create(createDto, "user-1")).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(mockEventoRepo.create).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Catalog cross-validation (feature flag CATALOG_VALIDATION_ENABLED)
    // -----------------------------------------------------------------------
    describe("catalog cross-validation", () => {
      it("create con categoria 'eventos' inexistente/inactiva → BadRequestException (flag activo)", async () => {
        mockEventoRepo.findBySlug.mockResolvedValue(null);
        mockCatalogValidator.assertCategoriaActiva.mockRejectedValue(
          new BadRequestException("Categoría inválida o inactiva"),
        );

        await expect(service.create(createDto, "user-1")).rejects.toThrow(
          BadRequestException,
        );
        expect(mockEventoRepo.create).not.toHaveBeenCalled();
        expect(mockCatalogValidator.assertCategoriaActiva).toHaveBeenCalledWith(
          "eventos",
        );
      });

      it("create con subcategoriaId inactivo → BadRequestException (flag activo)", async () => {
        mockEventoRepo.findBySlug.mockResolvedValue(null);
        mockCatalogValidator.assertSubcategoriaActiva.mockRejectedValue(
          new BadRequestException("Subcategoría inválida o inactiva"),
        );

        await expect(service.create(createDto, "user-1")).rejects.toThrow(
          BadRequestException,
        );
        expect(mockEventoRepo.create).not.toHaveBeenCalled();
        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).toHaveBeenCalledWith("eventos", "ferias-gastronomicas");
      });

      it("create con barrioId inactivo → BadRequestException (flag activo)", async () => {
        mockEventoRepo.findBySlug.mockResolvedValue(null);
        mockCatalogValidator.assertBarrioActivo.mockRejectedValue(
          new BadRequestException("Barrio inválido o inactivo"),
        );

        await expect(service.create(createDto, "user-1")).rejects.toThrow(
          BadRequestException,
        );
        expect(mockEventoRepo.create).not.toHaveBeenCalled();
      });

      it("flag desactivado → no ejecuta validación de catálogo", async () => {
        mockCatalogValidator.enabled = false;
        mockEventoRepo.findBySlug.mockResolvedValue(null);
        mockEventoRepo.create.mockImplementation(async (data) =>
          makeEvento({
            ...data,
            id: "new-evento",
            createdAt: new Date(),
            updatedAt: new Date(),
            fechaInicio: new Date(data.fechaInicio as unknown as string),
            fechaFin: new Date(data.fechaFin as unknown as string),
          } as unknown as Partial<Evento>),
        );
        mockSolicitudService.createEventoSolicitud.mockResolvedValue({
          id: "sol-new",
        });

        await service.create(createDto, "user-1");

        expect(
          mockCatalogValidator.assertCategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(mockCatalogValidator.assertBarrioActivo).not.toHaveBeenCalled();
      });
    });

    it("creates evento with all optional fields", async () => {
      const fullDto = {
        ...createDto,
        organizadorContacto: "+56987654321",
        organizadorWeb: "https://example.com",
        ubicacionNombre: "Playa Amarilla",
        capacidadMaxima: 500,
        portada: "https://example.com/portada.jpg",
        accesibilidad: ["acceso-silla-ruedas", "banos-accesibles"],
      };
      mockEventoRepo.findBySlug.mockResolvedValue(null);
      mockEventoRepo.create.mockImplementation(async (data) =>
        makeEvento({
          ...data,
          id: "new-evento",
          createdAt: new Date(),
          updatedAt: new Date(),
          fechaInicio: new Date(data.fechaInicio as unknown as string),
          fechaFin: new Date(data.fechaFin as unknown as string),
        } as unknown as Partial<Evento>),
      );
      mockSolicitudService.createEventoSolicitud.mockResolvedValue({
        id: "sol-new",
      });

      const result = await service.create(fullDto, "user-1");

      expect(result.organizadorContacto).toBe("+56987654321");
      expect(result.organizadorWeb).toBe("https://example.com");
      expect(result.ubicacionNombre).toBe("Playa Amarilla");
      expect(result.capacidadMaxima).toBe(500);
      expect(result.portada).toBe("https://example.com/portada.jpg");
      expect(result.accesibilidad).toEqual([
        "acceso-silla-ruedas",
        "banos-accesibles",
      ]);
    });
  });

  // =========================================================================
  // findAllPublic
  // =========================================================================
  describe("findAllPublic", () => {
    it("returns only approved eventos with meta", async () => {
      const paginatedResult = {
        data: [makeEvento()],
        total: 1,
      };
      mockEventoRepo.findAllPublic.mockResolvedValue(paginatedResult);

      const result = await service.findAllPublic({
        page: 1,
        limit: 20,
        estado: "programado",
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockEventoRepo.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20, estado: "programado" }),
      );
    });

    it("applies default estado programado if not provided", async () => {
      const paginatedResult = { data: [], total: 0 };
      mockEventoRepo.findAllPublic.mockResolvedValue(paginatedResult);

      await service.findAllPublic({ page: 1, limit: 10 });

      expect(mockEventoRepo.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({ estado: "programado" }),
      );
    });
  });

  // =========================================================================
  // findAllAdmin
  // =========================================================================
  describe("findAllAdmin", () => {
    it("returns all eventos regardless of status", async () => {
      const paginatedResult = {
        data: [
          makeEvento({ status: "aprobado" }),
          makeEvento({ id: "e2", status: "pendiente" }),
          makeEvento({ id: "e3", status: "rechazado" }),
        ],
        total: 3,
      };
      mockEventoRepo.findAllAdmin.mockResolvedValue(paginatedResult);

      const result = await service.findAllAdmin({ page: 1, limit: 50 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
    });
  });

  // =========================================================================
  // findOnePublic
  // =========================================================================
  describe("findOnePublic", () => {
    it("returns evento when status is aprobado", async () => {
      const evento = makeEvento({ status: "aprobado" });
      mockEventoRepo.findById.mockResolvedValue(evento);

      const result = await service.findOnePublic("evento-1");
      expect(result).toEqual(evento);
    });

    it("throws NotFoundException when status is not aprobado", async () => {
      mockEventoRepo.findById.mockResolvedValue(
        makeEvento({ status: "pendiente" }),
      );

      await expect(service.findOnePublic("evento-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when evento does not exist", async () => {
      mockEventoRepo.findById.mockResolvedValue(null);

      await expect(service.findOnePublic("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // findBySlugPublic
  // =========================================================================
  describe("findBySlugPublic", () => {
    it("returns evento when status is aprobado", async () => {
      const evento = makeEvento({ status: "aprobado" });
      mockEventoRepo.findBySlug.mockResolvedValue(evento);

      const result = await service.findBySlugPublic(
        "feria-gastronomica-de-concon",
      );
      expect(result).toEqual(evento);
    });

    it("throws NotFoundException when status is not aprobado", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(
        makeEvento({ status: "pendiente" }),
      );

      await expect(
        service.findBySlugPublic("feria-gastronomica-de-concon"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when slug does not exist", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(null);

      await expect(service.findBySlugPublic("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================
  describe("findOne", () => {
    it("returns evento for any status", async () => {
      const evento = makeEvento({ status: "pendiente" });
      mockEventoRepo.findById.mockResolvedValue(evento);

      const result = await service.findOne("evento-1");
      expect(result).toEqual(evento);
    });

    it("throws NotFoundException when evento does not exist", async () => {
      mockEventoRepo.findById.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // findBySlug
  // =========================================================================
  describe("findBySlug", () => {
    it("returns evento for any status", async () => {
      const evento = makeEvento({ status: "rechazado" });
      mockEventoRepo.findBySlug.mockResolvedValue(evento);

      const result = await service.findBySlug("some-slug");
      expect(result).toEqual(evento);
    });

    it("returns null when slug does not exist", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(null);

      const result = await service.findBySlug("non-existent");
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe("update", () => {
    const updateDto = {
      descripcion: "Nueva descripción actualizada del evento.",
    };

    it("applies in-place update when status is pendiente (owner)", async () => {
      const existing = makeEvento({
        status: "pendiente",
        estado: "borrador",
        usuarioId: "user-1",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...patch } as Partial<Evento>),
      );

      const result = await service.update(
        "evento-1",
        updateDto,
        "user-1",
        "empresa",
      );

      expect(result.descripcion).toBe(
        "Nueva descripción actualizada del evento.",
      );
      expect(mockEventoRepo.update).toHaveBeenCalledTimes(1);
      expect(mockSolicitudService.createEventoSolicitud).not.toHaveBeenCalled();
    });

    it("creates solicitud actualizacion-evento when status is aprobado", async () => {
      const existing = makeEvento({
        status: "aprobado",
        usuarioId: "user-1",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...patch } as Partial<Evento>),
      );
      mockSolicitudService.createEventoSolicitud.mockResolvedValue({
        id: "sol-update",
      });

      const result = await service.update(
        "evento-1",
        updateDto,
        "user-1",
        "empresa",
      );

      expect(mockEventoRepo.update).not.toHaveBeenCalled();
      expect(mockSolicitudService.createEventoSolicitud).toHaveBeenCalledWith(
        expect.objectContaining({
          eventoId: "evento-1",
          usuarioId: "user-1",
          tipo: "actualizacion-evento",
          proposal: updateDto,
        }),
      );
      // Returns the existing (unchanged) evento
      expect(result.status).toBe("aprobado");
      expect(result.descripcion).toBe(existing.descripcion);
    });

    it("allows admin to update any evento", async () => {
      const existing = makeEvento({
        status: "aprobado",
        usuarioId: "other-user",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);

      const result = await service.update(
        "evento-1",
        updateDto,
        "admin-1",
        "admin",
      );

      expect(mockSolicitudService.createEventoSolicitud).toHaveBeenCalled();
      expect(mockEventoRepo.update).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when empresa tries to update another's evento", async () => {
      const existing = makeEvento({ usuarioId: "other-user" });
      mockEventoRepo.findById.mockResolvedValue(existing);

      await expect(
        service.update("evento-1", updateDto, "user-1", "empresa"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when evento does not exist", async () => {
      mockEventoRepo.findById.mockResolvedValue(null);

      await expect(
        service.update("non-existent", updateDto, "user-1", "empresa"),
      ).rejects.toThrow(NotFoundException);
    });

    it("regenerates slug when nombre changes", async () => {
      const existing = makeEvento({ status: "pendiente", usuarioId: "user-1" });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.findBySlug.mockResolvedValue(null);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...patch } as Partial<Evento>),
      );

      const result = await service.update(
        "evento-1",
        { nombre: "Nuevo Nombre Evento" },
        "user-1",
        "empresa",
      );

      expect(result.slug).toBe("nuevo-nombre-evento");
      expect(mockEventoRepo.findBySlug).toHaveBeenCalledWith(
        "nuevo-nombre-evento",
      );
    });

    it("throws ConflictException on duplicate slug during rename", async () => {
      const existing = makeEvento({ status: "pendiente", usuarioId: "user-1" });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.findBySlug.mockResolvedValue(
        makeEvento({ id: "other-evento" }),
      );

      await expect(
        service.update(
          "evento-1",
          { nombre: "Otro Evento" },
          "user-1",
          "empresa",
        ),
      ).rejects.toThrow(ConflictException);
    });

    // -----------------------------------------------------------------------
    // Catalog cross-validation — diff-aware (feature flag)
    // -----------------------------------------------------------------------
    describe("catalog cross-validation (diff-aware)", () => {
      it("PUT cambiando subcategoriaId → valida contra categoria 'eventos'", async () => {
        const existing = makeEvento({
          status: "pendiente",
          usuarioId: "user-1",
          subcategoriaId: "ferias-gastronomicas",
        });
        mockEventoRepo.findById.mockResolvedValue(existing);
        mockEventoRepo.update.mockImplementation(async (_id, patch) =>
          makeEvento({ ...existing, ...patch } as Partial<Evento>),
        );

        await service.update(
          "evento-1",
          { subcategoriaId: "conciertos" },
          "user-1",
          "empresa",
        );

        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).toHaveBeenCalledWith("eventos", "conciertos");
      });

      it("PUT tocando solo descripcion → NO valida catálogo", async () => {
        const existing = makeEvento({
          status: "pendiente",
          usuarioId: "user-1",
        });
        mockEventoRepo.findById.mockResolvedValue(existing);
        mockEventoRepo.update.mockImplementation(async (_id, patch) =>
          makeEvento({ ...existing, ...patch } as Partial<Evento>),
        );

        await service.update(
          "evento-1",
          { descripcion: "Nueva descripción" },
          "user-1",
          "empresa",
        );

        expect(
          mockCatalogValidator.assertCategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(mockCatalogValidator.assertBarrioActivo).not.toHaveBeenCalled();
      });

      it("PUT repitiendo subcategoriaId actual → NO valida", async () => {
        const existing = makeEvento({
          status: "pendiente",
          usuarioId: "user-1",
          subcategoriaId: "ferias-gastronomicas",
        });
        mockEventoRepo.findById.mockResolvedValue(existing);
        mockEventoRepo.update.mockImplementation(async (_id, patch) =>
          makeEvento({ ...existing, ...patch } as Partial<Evento>),
        );

        await service.update(
          "evento-1",
          { subcategoriaId: "ferias-gastronomicas" },
          "user-1",
          "empresa",
        );

        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).not.toHaveBeenCalled();
      });

      it("PUT cambiando barrioId → valida barrio", async () => {
        const existing = makeEvento({
          status: "pendiente",
          usuarioId: "user-1",
          barrioId: "centro",
        });
        mockEventoRepo.findById.mockResolvedValue(existing);
        mockEventoRepo.update.mockImplementation(async (_id, patch) =>
          makeEvento({ ...existing, ...patch } as Partial<Evento>),
        );

        await service.update(
          "evento-1",
          { barrioId: "higuerillas" },
          "user-1",
          "empresa",
        );

        expect(mockCatalogValidator.assertBarrioActivo).toHaveBeenCalledWith(
          "higuerillas",
        );
      });

      it("flag desactivado → update NO ejecuta validación", async () => {
        mockCatalogValidator.enabled = false;
        const existing = makeEvento({
          status: "pendiente",
          usuarioId: "user-1",
          subcategoriaId: "ferias-gastronomicas",
          barrioId: "centro",
        });
        mockEventoRepo.findById.mockResolvedValue(existing);
        mockEventoRepo.update.mockImplementation(async (_id, patch) =>
          makeEvento({ ...existing, ...patch } as Partial<Evento>),
        );

        await service.update(
          "evento-1",
          { subcategoriaId: "conciertos", barrioId: "higuerillas" },
          "user-1",
          "empresa",
        );

        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(mockCatalogValidator.assertBarrioActivo).not.toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // remove
  // =========================================================================
  describe("remove", () => {
    it("deletes evento when no pending solicitudes exist (owner)", async () => {
      const existing = makeEvento({ usuarioId: "user-1" });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockSolicitudService.existsPendingByEventoId.mockResolvedValue(false);
      mockEventoRepo.delete.mockResolvedValue(undefined);

      await service.remove("evento-1", "user-1", "empresa");

      expect(mockEventoRepo.delete).toHaveBeenCalledWith("evento-1");
    });

    it("allows admin to delete any evento", async () => {
      const existing = makeEvento({ usuarioId: "other-user" });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockSolicitudService.existsPendingByEventoId.mockResolvedValue(false);

      await service.remove("evento-1", "admin-1", "admin");

      expect(mockEventoRepo.delete).toHaveBeenCalledWith("evento-1");
    });

    it("throws ConflictException when pending solicitudes exist", async () => {
      const existing = makeEvento({ usuarioId: "user-1" });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockSolicitudService.existsPendingByEventoId.mockResolvedValue(true);

      await expect(
        service.remove("evento-1", "user-1", "empresa"),
      ).rejects.toThrow(ConflictException);
      expect(mockEventoRepo.delete).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when empresa tries to delete another's evento", async () => {
      const existing = makeEvento({ usuarioId: "other-user" });
      mockEventoRepo.findById.mockResolvedValue(existing);

      await expect(
        service.remove("evento-1", "user-1", "empresa"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when evento does not exist", async () => {
      mockEventoRepo.findById.mockResolvedValue(null);

      await expect(
        service.remove("non-existent", "user-1", "empresa"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // listMapData
  // =========================================================================
  describe("listMapData", () => {
    it("returns map data for approved eventos only", async () => {
      const mapData = [
        {
          id: "e1",
          nombre: "Evento 1",
          slug: "evento-1",
          coordenadas: { lat: -33, lng: -71 },
          categoriaId: "eventos",
          fechaInicio: new Date(),
        },
      ];
      mockEventoRepo.listMapData.mockResolvedValue(mapData);

      const result = await service.listMapData();

      expect(result).toEqual(mapData);
      expect(mockEventoRepo.listMapData).toHaveBeenCalled();
    });
  });
});
