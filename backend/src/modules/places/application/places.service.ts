/**
 * Application service for the Place aggregate.
 *
 * Orchestrate domain logic: CRUD, slug generation, solicitud auto-creation,
 * open-now derivation, and business-rule enforcement.
 */
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { PlaceRepositoryInterface } from "../domain/place-repository.interface";
import type { SolicitudesRepositoryInterface } from "../domain/solicitudes-repository.interface";
import type { Place } from "../domain/place.entity";
import type { HorarioDia, Turno } from "../domain/horario-dia.vo";
import type { RedSocial } from "../domain/red-social.vo";
import { SOLICITUDES_REPOSITORY } from "../domain/solicitudes-repository.token";
import { PLACE_REPOSITORY } from "../domain/place-repository.token";
import type { AuthContext } from "../../auth/domain/auth-context.interface";
// Value import: CatalogValidator is used as a DI token, so it must be
// present at runtime (a type-only import would erase it and break DI).
import { CatalogValidator } from "../../categorias/application/catalog-validator.service";
import {
  assertGalleryLimit,
  assertOwnership,
  buildPlacePatch,
  toPlain,
  toPlainArray,
  resolveAbiertoAhora,
  validateCatalogReferences,
  type AbiertoAhoraResponse,
} from "./places-service.helpers";

// ---------------------------------------------------------------------------
// DTO types (mirrors what the controller will receive after validation)
// ---------------------------------------------------------------------------

export interface CreatePlaceDto {
  nombre: string;
  descripcionCorta: string;
  descripcion: string;
  categoriaId: string;
  subcategoriaId?: string;
  barrioId: string;
  direccion: string;
  coordenadas?: { lat: number; lng: number };
  telefono?: string;
  whatsapp?: string;
  email?: string;
  sitioWeb?: string;
  redesSociales?: RedSocial[];
  imagenes?: { logo?: string; portada?: string; galeria: string[] };
  planId: "gratuito" | "premium";
  horarios?: HorarioDia[];
  horariosEspeciales?: {
    fecha: string;
    descripcion: string;
    turnos: Turno[];
  }[];
  abierto24x7?: boolean;
  servicios?: string[];
  metodosPago?: string[];
  idiomas?: string[];
}

export type UpdatePlaceDto = Partial<CreatePlaceDto>;

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    @Inject(PLACE_REPOSITORY)
    private readonly placeRepo: PlaceRepositoryInterface,
    @Inject(SOLICITUDES_REPOSITORY)
    private readonly solicitudRepo: SolicitudesRepositoryInterface,
    private readonly catalogValidator: CatalogValidator,
  ) {}

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async createPlace(dto: CreatePlaceDto, usuarioId: string): Promise<Place> {
    const slug = slugify(dto.nombre);

    // Uniqueness check
    const existing = await this.placeRepo.findBySlug(slug);
    if (existing) {
      throw new ConflictException("Slug duplicado");
    }

    // Cross-catalog validation (only when the feature flag is enabled)
    if (this.catalogValidator.enabled) {
      await this.catalogValidator.assertCategoriaActiva(dto.categoriaId);
      if (dto.subcategoriaId) {
        await this.catalogValidator.assertSubcategoriaActiva(
          dto.categoriaId,
          dto.subcategoriaId,
        );
      }
      await this.catalogValidator.assertBarrioActivo(dto.barrioId);
    }

    // Gallery limit per plan
    assertGalleryLimit(dto.imagenes?.galeria, dto.planId);

    const now = new Date();

    // Persist place
    const place = await this.placeRepo.save({
      nombre: dto.nombre,
      slug,
      descripcionCorta: dto.descripcionCorta,
      descripcion: dto.descripcion,
      categoriaId: dto.categoriaId,
      subcategoriaId: dto.subcategoriaId,
      barrioId: dto.barrioId,
      direccion: dto.direccion,
      coordenadas: dto.coordenadas ?? { lat: 0, lng: 0 },
      telefono: dto.telefono,
      whatsapp: dto.whatsapp,
      email: dto.email,
      sitioWeb: dto.sitioWeb,
      redesSociales: toPlain(dto.redesSociales),
      imagenes: dto.imagenes
        ? {
            logo: dto.imagenes.logo,
            portada: dto.imagenes.portada,
            galeria: dto.imagenes.galeria ?? [],
          }
        : { galeria: [] },
      planId: dto.planId,
      horarios: toPlainArray(dto.horarios),
      horariosEspeciales: toPlainArray(
        dto.horariosEspeciales as Place["horariosEspeciales"],
      ),
      abierto24x7: dto.abierto24x7 ?? false,
      servicios: dto.servicios as Place["servicios"],
      metodosPago: dto.metodosPago as Place["metodosPago"],
      idiomas: dto.idiomas,
      vistasTotales: 0,
      status: "pendiente",
      verificado: false,
      destacado: false,
      usuarioId,
    });

    // Auto-create solicitud
    await this.solicitudRepo.create({
      placeId: place.id,
      usuarioId,
      tipo: "registro",
      status: "pendiente",
      createdAt: now,
    });

    this.logger.log(`Place created: ${place.id} (slug: ${slug})`);
    return place;
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  async findById(id: string): Promise<Place> {
    const place = await this.placeRepo.findById(id);
    if (!place) {
      throw new NotFoundException(`Place ${id} no encontrado`);
    }
    return place;
  }

  async findBySlug(slug: string): Promise<Place | null> {
    return this.placeRepo.findBySlug(slug);
  }

  async search(filters: {
    q?: string;
    categoriaId?: string;
    barrioId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.placeRepo.search(filters);
  }

  async findForMap() {
    return this.placeRepo.findForMap();
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  async update(
    id: string,
    dto: UpdatePlaceDto,
    actor: AuthContext,
  ): Promise<Place> {
    const existing = await this.placeRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Place ${id} no encontrado`);
    }

    assertOwnership(existing, actor, "modificar este lugar");

    if (this.catalogValidator.enabled) {
      await validateCatalogReferences(this.catalogValidator, dto, existing);
    }

    const effectivePlanId = dto.planId ?? existing.planId;
    if (dto.imagenes?.galeria) {
      assertGalleryLimit(dto.imagenes.galeria, effectivePlanId);
    }

    const patch = buildPlacePatch(dto);
    const newSlug = await this.resolveSlug(dto, existing, id);
    if (newSlug) {
      patch.slug = newSlug;
    }
    patch.updatedAt = new Date();

    return this.placeRepo.update(id, patch);
  }

  private async resolveSlug(
    dto: UpdatePlaceDto,
    existing: Place,
    id: string,
  ): Promise<string | undefined> {
    if (!dto.nombre || dto.nombre === existing.nombre) {
      return undefined;
    }
    const newSlug = slugify(dto.nombre);
    const slugOwner = await this.placeRepo.findBySlug(newSlug);
    if (slugOwner && slugOwner.id !== id) {
      throw new ConflictException("Slug duplicado");
    }
    return newSlug;
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async delete(id: string, actor: AuthContext): Promise<void> {
    const existing = await this.placeRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Place ${id} no encontrado`);
    }

    assertOwnership(existing, actor, "eliminar este lugar");

    const hasSolicitudes = await this.solicitudRepo.existsByPlaceId(id);
    if (hasSolicitudes) {
      throw new ConflictException(
        "No se puede eliminar: existen solicitudes asociadas a este lugar",
      );
    }

    await this.placeRepo.delete(id);
    this.logger.log(`Place deleted: ${id}`);
  }

  // -------------------------------------------------------------------------
  // abiertoAhora
  // -------------------------------------------------------------------------

  async abiertoAhora(
    id: string,
    now: Date = new Date(),
  ): Promise<AbiertoAhoraResponse> {
    const place = await this.placeRepo.findById(id);
    if (!place) {
      throw new NotFoundException(`Place ${id} no encontrado`);
    }
    return resolveAbiertoAhora(place, now);
  }
}
