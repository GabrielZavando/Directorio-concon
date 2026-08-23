/**
 * Unit tests for PlacesService.
 * TDD RED phase — these tests will fail until the service is implemented.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PlacesService } from "./places.service";
import type {
  PlaceRepositoryInterface,
  PaginatedPlaces,
} from "../domain/place-repository.interface";
import type {
  SolicitudesRepositoryInterface,
  Solicitud,
} from "../domain/solicitudes-repository.interface";
import type { Place } from "../domain/place.entity";
import type { AuthContext } from "../../auth/domain/auth-context.interface";
import type { CatalogValidator } from "../../categorias/application/catalog-validator.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makePlace(overrides: Partial<Place> = {}): Place {
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
    status: "aprobado",
    verificado: false,
    destacado: false,
    usuarioId: "user-1",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeSolicitud(overrides: Partial<Solicitud> = {}): Solicitud {
  return {
    id: "sol-1",
    placeId: "place-1",
    usuarioId: "user-1",
    tipo: "registro",
    status: "pendiente",
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPlaceRepo: jest.Mocked<PlaceRepositoryInterface> = {
  findById: jest.fn(),
  findBySlug: jest.fn(),
  search: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findForMap: jest.fn(),
};

const mockSolicitudRepo: jest.Mocked<SolicitudesRepositoryInterface> = {
  create: jest.fn(),
  existsByPlaceId: jest.fn(),
};

// Mock CatalogValidator — the `enabled` flag is toggled per-test to exercise
// both flag states (8.2). assert* methods default to resolving (valid catalog).
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
describe("PlacesService", () => {
  let service: PlacesService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCatalogValidator.enabled = true;
    // clearAllMocks() does NOT reset implementations — restore defaults so a
    // `mockRejectedValue`/`mockResolvedValue` from a previous test cannot leak.
    mockCatalogValidator.assertCategoriaActiva.mockResolvedValue(undefined);
    mockCatalogValidator.assertSubcategoriaActiva.mockResolvedValue(undefined);
    mockCatalogValidator.assertBarrioActivo.mockResolvedValue(undefined);
    service = new PlacesService(
      mockPlaceRepo,
      mockSolicitudRepo,
      mockCatalogValidator as unknown as CatalogValidator,
    );
  });

  // =========================================================================
  // createPlace
  // =========================================================================
  describe("createPlace", () => {
    const createDto = {
      nombre: "Restaurante El Marino",
      descripcionCorta: "Mariscos frescos",
      descripcion: "Restaurante familiar especializado en mariscos",
      categoriaId: "gastronomia",
      barrioId: "higuerillas",
      direccion: "Av. Borgoño 123",
      coordenadas: { lat: -33.01, lng: -71.54 },
      imagenes: { galeria: [] },
      planId: "gratuito" as const,
      abierto24x7: false,
    };

    it("generates slug, creates place with status pendiente, creates solicitud", async () => {
      mockPlaceRepo.findBySlug.mockResolvedValue(null);
      mockPlaceRepo.save.mockImplementation(async (data) =>
        makePlace({
          ...data,
          id: "new-id",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Partial<Place>),
      );
      mockSolicitudRepo.create.mockImplementation(async (input) =>
        makeSolicitud({ ...input, id: "sol-new" }),
      );

      const result = await service.createPlace(createDto, "user-1");

      expect(result.id).toBe("new-id");
      expect(result.status).toBe("pendiente");
      expect(result.slug).toBe("restaurante-el-marino");
      expect(result.usuarioId).toBe("user-1");
      expect(mockPlaceRepo.findBySlug).toHaveBeenCalledWith(
        "restaurante-el-marino",
      );
      expect(mockPlaceRepo.save).toHaveBeenCalledTimes(1);
      expect(mockSolicitudRepo.create).toHaveBeenCalledTimes(1);
      expect(mockSolicitudRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          placeId: "new-id",
          usuarioId: "user-1",
          tipo: "registro",
          status: "pendiente",
        }),
      );
    });

    it("throws ConflictException on duplicate slug", async () => {
      mockPlaceRepo.findBySlug.mockResolvedValue(makePlace());

      await expect(service.createPlace(createDto, "user-1")).rejects.toThrow(
        ConflictException,
      );
      expect(mockPlaceRepo.save).not.toHaveBeenCalled();
      expect(mockSolicitudRepo.create).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Catalog cross-validation (feature flag CATALOG_VALIDATION_ENABLED)
    // -----------------------------------------------------------------------
    describe("catalog cross-validation", () => {
      it("create con categoriaId inactivo → BadRequestException (flag activo)", async () => {
        mockPlaceRepo.findBySlug.mockResolvedValue(null);
        mockCatalogValidator.assertCategoriaActiva.mockRejectedValue(
          new BadRequestException("Categoría inválida o inactiva"),
        );

        await expect(service.createPlace(createDto, "user-1")).rejects.toThrow(
          BadRequestException,
        );
        expect(mockPlaceRepo.save).not.toHaveBeenCalled();
        expect(mockSolicitudRepo.create).not.toHaveBeenCalled();
      });

      it("create con subcategoriaId inactivo → BadRequestException (flag activo)", async () => {
        mockPlaceRepo.findBySlug.mockResolvedValue(null);
        mockCatalogValidator.assertSubcategoriaActiva.mockRejectedValue(
          new BadRequestException("Subcategoría inválida o inactiva"),
        );

        await expect(
          service.createPlace(
            { ...createDto, subcategoriaId: "restaurantes" },
            "user-1",
          ),
        ).rejects.toThrow(BadRequestException);
        expect(mockPlaceRepo.save).not.toHaveBeenCalled();
      });

      it("create con barrioId inactivo → BadRequestException (flag activo)", async () => {
        mockPlaceRepo.findBySlug.mockResolvedValue(null);
        mockCatalogValidator.assertBarrioActivo.mockRejectedValue(
          new BadRequestException("Barrio inválido o inactivo"),
        );

        await expect(service.createPlace(createDto, "user-1")).rejects.toThrow(
          BadRequestException,
        );
        expect(mockPlaceRepo.save).not.toHaveBeenCalled();
      });

      it("flag desactivado → no ejecuta validación de catálogo", async () => {
        mockCatalogValidator.enabled = false;
        mockPlaceRepo.findBySlug.mockResolvedValue(null);
        mockPlaceRepo.save.mockImplementation(async (data) =>
          makePlace({
            ...data,
            id: "new-id",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Partial<Place>),
        );
        mockSolicitudRepo.create.mockImplementation(async (input) =>
          makeSolicitud({ ...input, id: "sol-new" }),
        );

        await service.createPlace(createDto, "user-1");

        expect(
          mockCatalogValidator.assertCategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(mockCatalogValidator.assertBarrioActivo).not.toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // findBySlug
  // =========================================================================
  describe("findBySlug", () => {
    it("returns place when found", async () => {
      const place = makePlace();
      mockPlaceRepo.findBySlug.mockResolvedValue(place);

      const result = await service.findBySlug("restaurante-el-marino");
      expect(result).toEqual(place);
    });

    it("returns null when not found", async () => {
      mockPlaceRepo.findBySlug.mockResolvedValue(null);

      const result = await service.findBySlug("non-existent");
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // findById
  // =========================================================================
  describe("findById", () => {
    it("returns place when found", async () => {
      const place = makePlace();
      mockPlaceRepo.findById.mockResolvedValue(place);

      const result = await service.findById("place-1");
      expect(result).toEqual(place);
    });

    it("throws NotFoundException when not found", async () => {
      mockPlaceRepo.findById.mockResolvedValue(null);

      await expect(service.findById("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // search
  // =========================================================================
  describe("search", () => {
    it("delegates to repository with filters", async () => {
      const paginatedResult: PaginatedPlaces = {
        data: [makePlace()],
        total: 1,
      };
      mockPlaceRepo.search.mockResolvedValue(paginatedResult);

      const result = await service.search({
        categoriaId: "gastronomia",
        barrioId: "centro",
        q: "pizza",
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(paginatedResult);
      expect(mockPlaceRepo.search).toHaveBeenCalledWith({
        categoriaId: "gastronomia",
        barrioId: "centro",
        q: "pizza",
        page: 1,
        limit: 20,
      });
    });
  });

  // =========================================================================
  // update (auth: actor ownership — owner only own place, admin any)
  // =========================================================================
  describe("update", () => {
    const ownerActor: AuthContext = {
      uid: "user-1",
      email: "owner@example.com",
      rol: "owner",
    };
    const foreignOwnerActor: AuthContext = {
      uid: "user-2",
      email: "owner2@example.com",
      rol: "owner",
    };
    const adminActor: AuthContext = {
      uid: "admin-1",
      email: "admin@example.com",
      rol: "admin",
    };

    it("regenerates slug when nombre changes (owner own place)", async () => {
      const existing = makePlace({ usuarioId: ownerActor.uid });
      mockPlaceRepo.findById.mockResolvedValue(existing);
      mockPlaceRepo.findBySlug.mockResolvedValue(null);
      mockPlaceRepo.update.mockImplementation(async (_id, patch) =>
        makePlace({ ...existing, ...patch } as Partial<Place>),
      );

      const result = await service.update(
        "place-1",
        { nombre: "Nuevo Nombre" },
        ownerActor,
      );

      expect(result.slug).toBe("nuevo-nombre");
      expect(mockPlaceRepo.findBySlug).toHaveBeenCalledWith("nuevo-nombre");
      expect(mockPlaceRepo.update).toHaveBeenCalledWith(
        "place-1",
        expect.objectContaining({ slug: "nuevo-nombre" }),
      );
    });

    it("does not change slug when nombre is not provided (owner own place)", async () => {
      const existing = makePlace({ usuarioId: ownerActor.uid });
      mockPlaceRepo.findById.mockResolvedValue(existing);
      mockPlaceRepo.update.mockImplementation(async (_id, patch) =>
        makePlace({ ...existing, ...patch } as Partial<Place>),
      );

      const result = await service.update(
        "place-1",
        { telefono: "+56912345678" },
        ownerActor,
      );

      expect(result.slug).toBe("restaurante-el-marino");
      expect(mockPlaceRepo.findBySlug).not.toHaveBeenCalled();
    });

    it("throws ConflictException on duplicate slug during rename", async () => {
      const existing = makePlace({ usuarioId: ownerActor.uid });
      mockPlaceRepo.findById.mockResolvedValue(existing);
      // Another place already owns this slug
      mockPlaceRepo.findBySlug.mockResolvedValue(
        makePlace({ id: "other-place", slug: "otro-lugar" }),
      );

      await expect(
        service.update("place-1", { nombre: "Otro Lugar" }, ownerActor),
      ).rejects.toThrow(ConflictException);
    });

    it("throws NotFoundException when place does not exist", async () => {
      mockPlaceRepo.findById.mockResolvedValue(null);

      await expect(
        service.update("non-existent", { nombre: "Test" }, ownerActor),
      ).rejects.toThrow(NotFoundException);
    });

    it("owner updating own place → applies patch", async () => {
      const existing = makePlace({ usuarioId: ownerActor.uid });
      mockPlaceRepo.findById.mockResolvedValue(existing);
      mockPlaceRepo.update.mockImplementation(async (_id, patch) =>
        makePlace({ ...existing, ...patch } as Partial<Place>),
      );

      const result = await service.update(
        "place-1",
        { telefono: "+56911111111" },
        ownerActor,
      );

      expect(result.telefono).toBe("+56911111111");
      expect(mockPlaceRepo.update).toHaveBeenCalledTimes(1);
    });

    it("owner updating a foreign place → ForbiddenException, no update", async () => {
      const existing = makePlace({ usuarioId: ownerActor.uid });
      mockPlaceRepo.findById.mockResolvedValue(existing);

      await expect(
        service.update(
          "place-1",
          { telefono: "+56999999999" },
          foreignOwnerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPlaceRepo.update).not.toHaveBeenCalled();
    });

    it("admin updating any place → applies patch", async () => {
      const existing = makePlace({ usuarioId: ownerActor.uid });
      mockPlaceRepo.findById.mockResolvedValue(existing);
      mockPlaceRepo.update.mockImplementation(async (_id, patch) =>
        makePlace({ ...existing, ...patch } as Partial<Place>),
      );

      const result = await service.update(
        "place-1",
        { telefono: "+56955555555" },
        adminActor,
      );

      expect(result.telefono).toBe("+56955555555");
      expect(mockPlaceRepo.update).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // Catalog cross-validation — diff-aware (feature flag)
    // -----------------------------------------------------------------------
    describe("catalog cross-validation (diff-aware)", () => {
      it("PUT cambiando categoriaId a inactivo → BadRequestException", async () => {
        const existing = makePlace({
          usuarioId: ownerActor.uid,
          categoriaId: "gastronomia",
        });
        mockPlaceRepo.findById.mockResolvedValue(existing);
        mockCatalogValidator.assertCategoriaActiva.mockRejectedValue(
          new BadRequestException("Categoría inválida o inactiva"),
        );

        await expect(
          service.update("place-1", { categoriaId: "comercio" }, ownerActor),
        ).rejects.toThrow(BadRequestException);
        expect(mockPlaceRepo.update).not.toHaveBeenCalled();
      });

      it("PUT tocando solo nombre → NO valida catálogo", async () => {
        const existing = makePlace({
          usuarioId: ownerActor.uid,
          categoriaId: "gastronomia",
          barrioId: "higuerillas",
        });
        mockPlaceRepo.findById.mockResolvedValue(existing);
        mockPlaceRepo.findBySlug.mockResolvedValue(null);
        mockPlaceRepo.update.mockImplementation(async (_id, patch) =>
          makePlace({ ...existing, ...patch } as Partial<Place>),
        );

        await service.update("place-1", { nombre: "Nuevo Nombre" }, ownerActor);

        expect(
          mockCatalogValidator.assertCategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(mockCatalogValidator.assertBarrioActivo).not.toHaveBeenCalled();
      });

      it("PUT repitiendo categoriaId actual → NO valida", async () => {
        const existing = makePlace({
          usuarioId: ownerActor.uid,
          categoriaId: "gastronomia",
        });
        mockPlaceRepo.findById.mockResolvedValue(existing);
        mockPlaceRepo.update.mockImplementation(async (_id, patch) =>
          makePlace({ ...existing, ...patch } as Partial<Place>),
        );

        await service.update(
          "place-1",
          { categoriaId: "gastronomia" },
          ownerActor,
        );

        expect(
          mockCatalogValidator.assertCategoriaActiva,
        ).not.toHaveBeenCalled();
      });

      it("PUT cambiando barrioId → valida barrio", async () => {
        const existing = makePlace({
          usuarioId: ownerActor.uid,
          barrioId: "higuerillas",
        });
        mockPlaceRepo.findById.mockResolvedValue(existing);
        mockPlaceRepo.update.mockImplementation(async (_id, patch) =>
          makePlace({ ...existing, ...patch } as Partial<Place>),
        );

        await service.update("place-1", { barrioId: "centro" }, ownerActor);

        expect(mockCatalogValidator.assertBarrioActivo).toHaveBeenCalledWith(
          "centro",
        );
      });

      it("PUT cambiando categoriaId+subcategoriaId → valida ambos contra el nuevo categoriaId", async () => {
        const existing = makePlace({
          usuarioId: ownerActor.uid,
          categoriaId: "gastronomia",
          subcategoriaId: "restaurantes",
        });
        mockPlaceRepo.findById.mockResolvedValue(existing);
        mockPlaceRepo.update.mockImplementation(async (_id, patch) =>
          makePlace({ ...existing, ...patch } as Partial<Place>),
        );

        await service.update(
          "place-1",
          { categoriaId: "comercio", subcategoriaId: "retail" },
          ownerActor,
        );

        expect(mockCatalogValidator.assertCategoriaActiva).toHaveBeenCalledWith(
          "comercio",
        );
        expect(
          mockCatalogValidator.assertSubcategoriaActiva,
        ).toHaveBeenCalledWith("comercio", "retail");
      });

      it("flag desactivado → update NO ejecuta validación", async () => {
        mockCatalogValidator.enabled = false;
        const existing = makePlace({
          usuarioId: ownerActor.uid,
          categoriaId: "gastronomia",
          barrioId: "higuerillas",
        });
        mockPlaceRepo.findById.mockResolvedValue(existing);
        mockPlaceRepo.update.mockImplementation(async (_id, patch) =>
          makePlace({ ...existing, ...patch } as Partial<Place>),
        );

        await service.update(
          "place-1",
          { categoriaId: "comercio", barrioId: "centro" },
          ownerActor,
        );

        expect(
          mockCatalogValidator.assertCategoriaActiva,
        ).not.toHaveBeenCalled();
        expect(mockCatalogValidator.assertBarrioActivo).not.toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // delete (auth: actor ownership — owner only own place, admin any)
  // =========================================================================
  describe("delete", () => {
    const ownerActor: AuthContext = {
      uid: "user-1",
      email: "owner@example.com",
      rol: "owner",
    };
    const foreignOwnerActor: AuthContext = {
      uid: "user-2",
      email: "owner2@example.com",
      rol: "owner",
    };
    const adminActor: AuthContext = {
      uid: "admin-1",
      email: "admin@example.com",
      rol: "admin",
    };

    it("owner deletes own place when no solicitudes exist", async () => {
      mockPlaceRepo.findById.mockResolvedValue(
        makePlace({ usuarioId: ownerActor.uid }),
      );
      mockSolicitudRepo.existsByPlaceId.mockResolvedValue(false);
      mockPlaceRepo.delete.mockResolvedValue(undefined);

      await service.delete("place-1", ownerActor);

      expect(mockPlaceRepo.delete).toHaveBeenCalledWith("place-1");
    });

    it("owner deleting a foreign place → ForbiddenException, no delete", async () => {
      mockPlaceRepo.findById.mockResolvedValue(
        makePlace({ usuarioId: ownerActor.uid }),
      );

      await expect(
        service.delete("place-1", foreignOwnerActor),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPlaceRepo.delete).not.toHaveBeenCalled();
      expect(mockSolicitudRepo.existsByPlaceId).not.toHaveBeenCalled();
    });

    it("admin deleting any place → proceeds (solicitudes guard applies)", async () => {
      mockPlaceRepo.findById.mockResolvedValue(
        makePlace({ usuarioId: ownerActor.uid }),
      );
      mockSolicitudRepo.existsByPlaceId.mockResolvedValue(false);
      mockPlaceRepo.delete.mockResolvedValue(undefined);

      await service.delete("place-1", adminActor);

      expect(mockPlaceRepo.delete).toHaveBeenCalledWith("place-1");
    });

    it("throws ConflictException when solicitudes exist", async () => {
      mockPlaceRepo.findById.mockResolvedValue(
        makePlace({ usuarioId: ownerActor.uid }),
      );
      mockSolicitudRepo.existsByPlaceId.mockResolvedValue(true);

      await expect(service.delete("place-1", ownerActor)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPlaceRepo.delete).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when place does not exist", async () => {
      mockPlaceRepo.findById.mockResolvedValue(null);

      await expect(service.delete("non-existent", ownerActor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // abiertoAhora
  // =========================================================================
  describe("abiertoAhora", () => {
    it("returns abierto: true for 24x7 place", async () => {
      const place = makePlace({ abierto24x7: true });
      mockPlaceRepo.findById.mockResolvedValue(place);

      const result = await service.abiertoAhora("place-1");
      expect(result.abierto).toBe(true);
    });

    it("returns abierto: true when current time is within a turno", async () => {
      const now = new Date("2025-07-15T14:00:00Z"); // Tuesday 10:00 Santiago (UTC-4)
      const place = makePlace({
        abierto24x7: false,
        horarios: [
          {
            dia: "martes",
            abierto: true,
            turnos: [{ apertura: "09:00", cierre: "17:00" }],
          },
        ],
      });
      mockPlaceRepo.findById.mockResolvedValue(place);

      const result = await service.abiertoAhora("place-1", now);
      expect(result.abierto).toBe(true);
      expect(result.turno).toEqual({ apertura: "09:00", cierre: "17:00" });
    });

    it("returns abierto: false when current time is outside all turnos", async () => {
      const now = new Date("2025-07-15T20:00:00Z"); // Tuesday 16:00 Santiago
      const place = makePlace({
        abierto24x7: false,
        horarios: [
          {
            dia: "martes",
            abierto: true,
            turnos: [{ apertura: "09:00", cierre: "13:00" }],
          },
        ],
      });
      mockPlaceRepo.findById.mockResolvedValue(place);

      const result = await service.abiertoAhora("place-1", now);
      expect(result.abierto).toBe(false);
    });

    it("uses horariosEspeciales when matching date found", async () => {
      // 2025-12-31 is a Wednesday
      const now = new Date("2025-12-31T15:00:00Z"); // 12:00 Santiago (UTC-3 in summer)
      const place = makePlace({
        abierto24x7: false,
        horarios: [
          {
            dia: "miercoles",
            abierto: true,
            turnos: [{ apertura: "09:00", cierre: "17:00" }],
          },
        ],
        horariosEspeciales: [
          {
            fecha: "2025-12-31",
            descripcion: "Nochevieja",
            turnos: [{ apertura: "10:00", cierre: "14:00" }],
          },
        ],
      });
      mockPlaceRepo.findById.mockResolvedValue(place);

      const result = await service.abiertoAhora("place-1", now);
      expect(result.abierto).toBe(true);
      expect(result.turno).toEqual({ apertura: "10:00", cierre: "14:00" });
    });

    it("returns abierto: false when horariosEspeciales has empty turnos", async () => {
      const now = new Date("2025-12-31T15:00:00Z");
      const place = makePlace({
        abierto24x7: false,
        horarios: [
          {
            dia: "miercoles",
            abierto: true,
            turnos: [{ apertura: "09:00", cierre: "17:00" }],
          },
        ],
        horariosEspeciales: [
          { fecha: "2025-12-31", descripcion: "Cerrado", turnos: [] },
        ],
      });
      mockPlaceRepo.findById.mockResolvedValue(place);

      const result = await service.abiertoAhora("place-1", now);
      expect(result.abierto).toBe(false);
    });

    it("throws NotFoundException when place not found", async () => {
      mockPlaceRepo.findById.mockResolvedValue(null);

      await expect(service.abiertoAhora("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
