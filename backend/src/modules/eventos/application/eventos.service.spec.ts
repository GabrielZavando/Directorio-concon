/**
 * Unit tests for EventosService — new model (activo + estadoVerificacion +
 * ubicacion + cambios, no auto-solicitudes, unified in-place edit with
 * reversion to pendiente, soft delete, admin verificar).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { EventosService } from "./eventos.service";
import type { EventoRepositoryInterface } from "../domain/evento-repository.interface";
import type { Evento } from "../domain/evento.entity";
import { EventoValidator } from "./evento-validator";
import type { CatalogValidator } from "../../categorias/application/catalog-validator.service";
import type { NotificacionesPort } from "./notificaciones.port";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
function createMockValidator(): jest.Mocked<EventoValidator> {
  return {
    validateCreate: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<EventoValidator>;
}

function createMockNotificaciones(): jest.Mocked<NotificacionesPort> {
  return {
    notifyEventoRevertidoPendiente: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificacionesPort>;
}

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
    modalidad: "presencial",
    ubicacion: {
      nombreLugar: undefined,
      direccion: "Av. Borgoño 1234, Concón",
      coordenadas: { lat: -32.998, lng: -71.518 },
    },
    fechaInicio: new Date("2026-08-15T10:00:00Z"),
    fechaFin: new Date("2026-08-17T22:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "todos"],
    nivelRuido: "alto",
    estado: "programado",
    destacado: false,
    estadoVerificacion: "verificado",
    activo: true,
    usuarioId: "user-1",
    vistasTotales: 0,
    cambios: [],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    fechaPublicacion: new Date("2026-01-01"),
    ...overrides,
  };
}

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

const mockValidator = createMockValidator();
const mockNotificaciones = createMockNotificaciones();

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

function buildService(): EventosService {
  return new EventosService(
    mockEventoRepo,
    mockValidator,
    mockCatalogValidator as unknown as CatalogValidator,
    mockNotificaciones,
  );
}

describe("EventosService", () => {
  let service: EventosService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidator.validateCreate.mockImplementation(async () => []);
    mockNotificaciones.notifyEventoRevertidoPendiente.mockResolvedValue(
      undefined,
    );
    mockCatalogValidator.enabled = true;
    mockCatalogValidator.assertCategoriaActiva.mockResolvedValue(undefined);
    mockCatalogValidator.assertSubcategoriaActiva.mockResolvedValue(undefined);
    mockCatalogValidator.assertBarrioActivo.mockResolvedValue(undefined);
    service = buildService();
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
      modalidad: "presencial",
      ubicacion: {
        direccion: "Av. Borgoño 1234, Concón",
        coordenadas: { lat: -32.998, lng: -71.518 },
      },
      fechaInicio: "2026-08-15T10:00:00Z",
      fechaFin: "2026-08-17T22:00:00Z",
      precioTipo: "gratis",
      precioValor: 0,
      precioMoneda: "CLP",
      publicoObjetivo: ["familia", "todos"],
      nivelRuido: "alto",
    };

    it("creates evento with slug, estadoVerificacion pendiente, visible (no solicitud)", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(null);
      mockEventoRepo.create.mockImplementation(async (data) =>
        makeEvento({
          ...(data as unknown as Partial<Evento>),
          id: "new-evento",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.create(createDto, "user-1");

      expect(result.id).toBe("new-evento");
      expect(result.estadoVerificacion).toBe("pendiente");
      expect(result.activo).toBe(true);
      expect(result.categoriaId).toBe("eventos");
      expect(result.slug).toBe("feria-gastronomica-de-concon");
      expect(result.usuarioId).toBe("user-1");
      expect(result.precioMoneda).toBe("CLP");
      expect(mockEventoRepo.findBySlug).toHaveBeenCalledWith(
        "feria-gastronomica-de-concon",
      );
      expect(mockEventoRepo.create).toHaveBeenCalledTimes(1);
      // New eventos MUST be created as 'programado' so they appear in the
      // default public list (which filters estado: 'programado').
      expect(mockEventoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: "programado",
          activo: true,
          estadoVerificacion: "pendiente",
        }),
      );
    });

    it("throws ConflictException on duplicate slug", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(makeEvento());

      await expect(service.create(createDto, "user-1")).rejects.toThrow(
        ConflictException,
      );
      expect(mockEventoRepo.create).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when validation fails", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(null);
      mockValidator.validateCreate.mockImplementation(async () => [
        "Barrio inválido o inactivo",
      ]);

      await expect(service.create(createDto, "user-1")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockEventoRepo.create).not.toHaveBeenCalled();
    });

    describe("catalog cross-validation (feature flag)", () => {
      it("create con categoria 'eventos' inexistente → BadRequestException (flag activo)", async () => {
        mockEventoRepo.findBySlug.mockResolvedValue(null);
        mockCatalogValidator.assertCategoriaActiva.mockRejectedValue(
          new BadRequestException("Categoría inválida o inactiva"),
        );

        await expect(service.create(createDto, "user-1")).rejects.toThrow(
          BadRequestException,
        );
        expect(mockEventoRepo.create).not.toHaveBeenCalled();
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
            ...(data as unknown as Partial<Evento>),
            id: "new-evento",
          }),
        );

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
        ubicacion: {
          nombreLugar: "Playa Amarilla",
          direccion: "Av. Borgoño 1234, Concón",
          coordenadas: { lat: -32.998, lng: -71.518 },
        },
        capacidadMaxima: 500,
        portada: "https://example.com/portada.jpg",
        accesibilidad: ["acceso-silla-ruedas", "banos-accesibles"],
      };
      mockEventoRepo.findBySlug.mockResolvedValue(null);
      mockEventoRepo.create.mockImplementation(async (data) =>
        makeEvento({
          ...(data as unknown as Partial<Evento>),
          id: "new-evento",
        }),
      );

      const result = await service.create(fullDto, "user-1");

      expect(result.organizadorContacto).toBe("+56987654321");
      expect(result.organizadorWeb).toBe("https://example.com");
      expect(result.ubicacion.nombreLugar).toBe("Playa Amarilla");
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
    it("returns only active eventos (any estadoVerificacion) with meta", async () => {
      mockEventoRepo.findAllPublic.mockResolvedValue({
        data: [makeEvento()],
        total: 1,
      });

      const result = await service.findAllPublic({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockEventoRepo.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          estado: "programado",
          activo: true,
        }),
      );
      // estadoVerificacion must NOT be forced to "verificado"
      const callFilters = (mockEventoRepo.findAllPublic as jest.Mock).mock
        .calls[0][0];
      expect(callFilters.estadoVerificacion).toBeUndefined();
    });

    it("passes through estadoVerificacion filter when provided (admin queue)", async () => {
      mockEventoRepo.findAllPublic.mockResolvedValue({ data: [], total: 0 });

      await service.findAllPublic({
        page: 1,
        limit: 10,
        estadoVerificacion: "pendiente",
      });

      expect(mockEventoRepo.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({
          estadoVerificacion: "pendiente",
          activo: true,
        }),
      );
    });

    it("applies default estado programado if not provided", async () => {
      mockEventoRepo.findAllPublic.mockResolvedValue({ data: [], total: 0 });

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
    it("returns all eventos regardless of estadoVerificacion", async () => {
      mockEventoRepo.findAllAdmin.mockResolvedValue({
        data: [
          makeEvento({ estadoVerificacion: "verificado" }),
          makeEvento({ id: "e2", estadoVerificacion: "pendiente" }),
          makeEvento({ id: "e3", estadoVerificacion: "rechazado" }),
        ],
        total: 3,
      });

      const result = await service.findAllAdmin({ page: 1, limit: 50 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
    });
  });

  // =========================================================================
  // findOnePublic
  // =========================================================================
  describe("findOnePublic", () => {
    it("returns evento when active (any estadoVerificacion)", async () => {
      mockEventoRepo.findById.mockResolvedValue(makeEvento());
      const result = await service.findOnePublic("evento-1");
      expect(result.id).toBe("evento-1");
    });

    it("returns evento when active even if pendiente", async () => {
      mockEventoRepo.findById.mockResolvedValue(
        makeEvento({ estadoVerificacion: "pendiente" }),
      );
      const result = await service.findOnePublic("evento-1");
      expect(result.estadoVerificacion).toBe("pendiente");
    });

    it("throws NotFoundException when inactive", async () => {
      mockEventoRepo.findById.mockResolvedValue(makeEvento({ activo: false }));
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
    it("returns evento when active (any estadoVerificacion)", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(makeEvento());
      const result = await service.findBySlugPublic(
        "feria-gastronomica-de-concon",
      );
      expect(result).toBeDefined();
    });

    it("returns evento when active even if pendiente", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(
        makeEvento({ estadoVerificacion: "pendiente" }),
      );
      const result = await service.findBySlugPublic(
        "feria-gastronomica-de-concon",
      );
      expect(result?.estadoVerificacion).toBe("pendiente");
    });

    it("throws NotFoundException when slug does not exist", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(null);
      await expect(service.findBySlugPublic("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // findOne / findBySlug (admin/owner, no restriction)
  // =========================================================================
  describe("findOne / findBySlug", () => {
    it("findOne returns evento for any estadoVerificacion", async () => {
      mockEventoRepo.findById.mockResolvedValue(
        makeEvento({ estadoVerificacion: "pendiente" }),
      );
      const result = await service.findOne("evento-1");
      expect(result.estadoVerificacion).toBe("pendiente");
    });

    it("findOne throws NotFoundException when missing", async () => {
      mockEventoRepo.findById.mockResolvedValue(null);
      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("findBySlug returns evento for any estadoVerificacion", async () => {
      mockEventoRepo.findBySlug.mockResolvedValue(
        makeEvento({ estadoVerificacion: "rechazado" }),
      );
      const result = await service.findBySlug("some-slug");
      expect(result?.estadoVerificacion).toBe("rechazado");
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe("update", () => {
    const updateDto = {
      descripcion: "Nueva descripción actualizada del evento.",
    };

    it("applies in-place update when pendiente (owner)", async () => {
      const existing = makeEvento({
        estadoVerificacion: "pendiente",
        usuarioId: "user-1",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
      );

      const result = await service.update(
        "evento-1",
        updateDto,
        "user-1",
        "owner",
      );

      expect(result.descripcion).toBe(
        "Nueva descripción actualizada del evento.",
      );
      expect(mockEventoRepo.update).toHaveBeenCalledTimes(1);
      expect(
        mockNotificaciones.notifyEventoRevertidoPendiente,
      ).not.toHaveBeenCalled();
    });

    it("updating to modalidad 'online' clears ubicacion in the persisted patch", async () => {
      const existing = makeEvento({
        estadoVerificacion: "pendiente",
        modalidad: "presencial",
        usuarioId: "user-1",
        ubicacion: {
          nombreLugar: "Plaza",
          direccion: "Av. 1",
          coordenadas: { lat: -32.9, lng: -71.5 },
        },
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      let capturedPatch: Record<string, unknown> = {};
      mockEventoRepo.update.mockImplementation(async (_id, patch) => {
        capturedPatch = patch as Record<string, unknown>;
        return makeEvento({ ...existing, ...(patch as Partial<Evento>) });
      });

      const result = await service.update(
        "evento-1",
        { modalidad: "online" } as any,
        "user-1",
        "owner",
      );

      expect(capturedPatch.ubicacion).toBeNull();
      expect(result.modalidad).toBe("online");
      expect(result.ubicacion).toBeNull();
    });

    it("rejects a partial PUT that adds ubicacion to an existing online evento", async () => {
      const existing = makeEvento({
        estadoVerificacion: "pendiente",
        modalidad: "online",
        usuarioId: "user-1",
        ubicacion: undefined,
      });
      mockEventoRepo.findById.mockResolvedValue(existing);

      await expect(
        service.update(
          "evento-1",
          { ubicacion: { coordenadas: { lat: -32.9, lng: -71.5 } } } as any,
          "user-1",
          "owner",
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockEventoRepo.update).not.toHaveBeenCalled();
    });

    it("records a cambio when a verified evento transitions to online and clears ubicacion", async () => {
      const existing = makeEvento({
        estadoVerificacion: "verificado",
        modalidad: "presencial",
        usuarioId: "user-1",
        ubicacion: {
          nombreLugar: "Plaza",
          direccion: "Av. 1",
          coordenadas: { lat: -32.9, lng: -71.5 },
        },
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      let capturedPatch: Record<string, unknown> = {};
      mockEventoRepo.update.mockImplementation(async (_id, patch) => {
        capturedPatch = patch as Record<string, unknown>;
        return makeEvento({ ...existing, ...(patch as Partial<Evento>) });
      });

      const result = await service.update(
        "evento-1",
        { modalidad: "online" } as any,
        "user-1",
        "owner",
      );

      expect(result.estadoVerificacion).toBe("pendiente");
      // The implicit ubicacion deletion (online) must be audited.
      const ubicacionCambio = result.cambios.find(
        (c) => c.campo === "ubicacion",
      );
      expect(ubicacionCambio).toBeDefined();
      expect(ubicacionCambio?.valorNuevo).toBeNull();
    });

    it("preserves ubicacion when updating to presencial with a new venue", async () => {
      const existing = makeEvento({
        estadoVerificacion: "pendiente",
        modalidad: "online",
        usuarioId: "user-1",
        ubicacion: undefined,
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      let capturedPatch: Record<string, unknown> = {};
      mockEventoRepo.update.mockImplementation(async (_id, patch) => {
        capturedPatch = patch as Record<string, unknown>;
        return makeEvento({ ...existing, ...(patch as Partial<Evento>) });
      });

      await service.update(
        "evento-1",
        {
          modalidad: "presencial",
          ubicacion: {
            coordenadas: { lat: -32.9, lng: -71.5 },
          },
        } as any,
        "user-1",
        "owner",
      );

      expect(capturedPatch.ubicacion).toEqual({
        coordenadas: { lat: -32.9, lng: -71.5 },
      });
    });

    it("update with fechaInicio/fechaFin passes Date instances to the repository (no string crash)", async () => {
      const existing = makeEvento({
        estadoVerificacion: "pendiente",
        usuarioId: "user-1",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      let capturedPatch: Record<string, unknown> = {};
      mockEventoRepo.update.mockImplementation(async (_id, patch) => {
        capturedPatch = patch as Record<string, unknown>;
        return makeEvento({ ...existing, ...(patch as Partial<Evento>) });
      });

      await service.update(
        "evento-1",
        {
          fechaInicio: "2026-09-01T18:00:00Z",
          fechaFin: "2026-09-01T22:00:00Z",
        } as any,
        "user-1",
        "owner",
      );

      expect(capturedPatch.fechaInicio).toBeInstanceOf(Date);
      expect(capturedPatch.fechaFin).toBeInstanceOf(Date);
    });

    it("editing a verified evento reverts to pendiente + records cambios + notifies", async () => {
      const existing = makeEvento({
        estadoVerificacion: "verificado",
        usuarioId: "user-1",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
      );

      const result = await service.update(
        "evento-1",
        updateDto,
        "user-1",
        "owner",
      );

      expect(result.estadoVerificacion).toBe("pendiente");
      expect(result.cambios.length).toBeGreaterThan(0);
      expect(
        mockNotificaciones.notifyEventoRevertidoPendiente,
      ).toHaveBeenCalledTimes(1);
    });

    it("allows admin to update any evento", async () => {
      const existing = makeEvento({
        estadoVerificacion: "verificado",
        usuarioId: "other-user",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
      );

      await service.update("evento-1", updateDto, "admin-1", "admin");
      expect(mockEventoRepo.update).toHaveBeenCalledTimes(1);
    });

    it("throws ForbiddenException when owner tries to update another's evento", async () => {
      const existing = makeEvento({ usuarioId: "other-user" });
      mockEventoRepo.findById.mockResolvedValue(existing);

      await expect(
        service.update("evento-1", updateDto, "user-1", "owner"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when evento does not exist", async () => {
      mockEventoRepo.findById.mockResolvedValue(null);
      await expect(
        service.update("non-existent", updateDto, "user-1", "owner"),
      ).rejects.toThrow(NotFoundException);
    });

    it("regenerates slug when nombre changes", async () => {
      const existing = makeEvento({
        estadoVerificacion: "pendiente",
        usuarioId: "user-1",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.findBySlug.mockResolvedValue(null);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
      );

      const result = await service.update(
        "evento-1",
        { nombre: "Nuevo Nombre Evento" },
        "user-1",
        "owner",
      );

      expect(result.slug).toBe("nuevo-nombre-evento");
    });

    it("throws ConflictException on duplicate slug during rename", async () => {
      const existing = makeEvento({
        estadoVerificacion: "pendiente",
        usuarioId: "user-1",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.findBySlug.mockResolvedValue(makeEvento({ id: "other" }));

      await expect(
        service.update(
          "evento-1",
          { nombre: "Otro Evento" },
          "user-1",
          "owner",
        ),
      ).rejects.toThrow(ConflictException);
    });

    describe("catalog cross-validation (diff-aware)", () => {
      it("PUT cambiando subcategoriaId → valida", async () => {
        const existing = makeEvento({
          estadoVerificacion: "pendiente",
          usuarioId: "user-1",
        });
        mockEventoRepo.findById.mockResolvedValue(existing);
        mockEventoRepo.update.mockImplementation(async (_id, patch) =>
          makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
        );

        await service.update(
          "evento-1",
          { subcategoriaId: "conciertos" },
          "user-1",
          "owner",
        );
        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).toHaveBeenCalledWith("eventos", "conciertos");
      });

      it("PUT tocando solo descripcion → NO valida catálogo", async () => {
        const existing = makeEvento({
          estadoVerificacion: "pendiente",
          usuarioId: "user-1",
        });
        mockEventoRepo.findById.mockResolvedValue(existing);
        mockEventoRepo.update.mockImplementation(async (_id, patch) =>
          makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
        );

        await service.update(
          "evento-1",
          { descripcion: "Nueva descripción" },
          "user-1",
          "owner",
        );
        expect(
          mockCatalogValidator.assertCategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(mockCatalogValidator.assertBarrioActivo).not.toHaveBeenCalled();
      });

      it("PUT cambiando barrioId → valida barrio", async () => {
        const existing = makeEvento({
          estadoVerificacion: "pendiente",
          usuarioId: "user-1",
          barrioId: "centro",
        });
        mockEventoRepo.findById.mockResolvedValue(existing);
        mockEventoRepo.update.mockImplementation(async (_id, patch) =>
          makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
        );

        await service.update(
          "evento-1",
          { barrioId: "higuerillas" },
          "user-1",
          "owner",
        );
        expect(mockCatalogValidator.assertBarrioActivo).toHaveBeenCalledWith(
          "higuerillas",
        );
      });

      it("flag desactivado → update NO ejecuta validación", async () => {
        mockCatalogValidator.enabled = false;
        const existing = makeEvento({
          estadoVerificacion: "pendiente",
          usuarioId: "user-1",
        });
        mockEventoRepo.findById.mockResolvedValue(existing);
        mockEventoRepo.update.mockImplementation(async (_id, patch) =>
          makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
        );

        await service.update(
          "evento-1",
          { subcategoriaId: "conciertos" },
          "user-1",
          "owner",
        );
        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).not.toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // verificar (admin)
  // =========================================================================
  describe("verificar", () => {
    it("verified → sets estadoVerificacion verificado + fechaPublicacion", async () => {
      const existing = makeEvento({ estadoVerificacion: "pendiente" });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
      );

      const result = await service.verificar(
        "evento-1",
        "verificado",
        "admin-1",
      );

      expect(result.estadoVerificacion).toBe("verificado");
      expect(result.fechaPublicacion).toBeDefined();
    });

    it("verified → makes evento publicly visible (activo true) and clears prior motivo", async () => {
      const existing = makeEvento({
        estadoVerificacion: "rechazado",
        activo: false,
        motivoRechazoVerificacion: "Falta documentación",
      });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
      );

      const result = await service.verificar(
        "evento-1",
        "verificado",
        "admin-1",
      );

      expect(result.estadoVerificacion).toBe("verificado");
      expect(result.activo).toBe(true);
      expect(result.motivoRechazoVerificacion).toBeUndefined();
    });

    it("rejected → sets rechazado + activo false + motivo", async () => {
      const existing = makeEvento({ estadoVerificacion: "pendiente" });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
      );

      const result = await service.verificar(
        "evento-1",
        "rechazado",
        "admin-1",
        "No cumple normas",
      );

      expect(result.estadoVerificacion).toBe("rechazado");
      expect(result.activo).toBe(false);
    });

    it("rejected without motivo → BadRequestException", async () => {
      const existing = makeEvento({ estadoVerificacion: "pendiente" });
      mockEventoRepo.findById.mockResolvedValue(existing);

      await expect(
        service.verificar("evento-1", "rechazado", "admin-1"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verificar("evento-1", "rechazado", "admin-1"),
      ).rejects.toThrow("motivo is required when resultado is 'rechazado'");
    });
  });

  // =========================================================================
  // remove (soft delete)
  // =========================================================================
  describe("remove", () => {
    it("soft-deletes (activo false) when owner", async () => {
      const existing = makeEvento({ usuarioId: "user-1" });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
      );

      const result = await service.remove("evento-1", "user-1", "owner");

      expect(mockEventoRepo.update).toHaveBeenCalledWith(
        "evento-1",
        expect.objectContaining({ activo: false }),
      );
      expect(result.activo).toBe(false);
    });

    it("allows admin to delete any evento", async () => {
      const existing = makeEvento({ usuarioId: "other-user" });
      mockEventoRepo.findById.mockResolvedValue(existing);
      mockEventoRepo.update.mockImplementation(async (_id, patch) =>
        makeEvento({ ...existing, ...(patch as Partial<Evento>) }),
      );

      await service.remove("evento-1", "admin-1", "admin");
      expect(mockEventoRepo.update).toHaveBeenCalledWith(
        "evento-1",
        expect.objectContaining({ activo: false }),
      );
    });

    it("throws ForbiddenException when owner tries to delete another's evento", async () => {
      const existing = makeEvento({ usuarioId: "other-user" });
      mockEventoRepo.findById.mockResolvedValue(existing);

      await expect(
        service.remove("evento-1", "user-1", "owner"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException when evento does not exist", async () => {
      mockEventoRepo.findById.mockResolvedValue(null);
      await expect(
        service.remove("non-existent", "user-1", "owner"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // listMapData
  // =========================================================================
  describe("listMapData", () => {
    it("returns lightweight map data from repository", async () => {
      const mapData = [
        {
          id: "e1",
          nombre: "Evento 1",
          slug: "evento-1",
          coordenadas: { lat: -33, lng: -71 },
          subcategoriaId: "ferias-gastronomicas",
          barrioId: "centro",
          fechaInicio: new Date(),
        },
      ];
      mockEventoRepo.listMapData.mockResolvedValue(mapData as never);

      const result = await service.listMapData();
      expect(result).toEqual(mapData);
      expect(mockEventoRepo.listMapData).toHaveBeenCalled();
    });
  });
});
