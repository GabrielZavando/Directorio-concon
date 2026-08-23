/**
 * Application service for the Place aggregate.
 *
 * Orchestrate domain logic: CRUD, slug generation, solicitud auto-creation,
 * open-now derivation, and business-rule enforcement.
 */
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
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
  findMatchingTurno,
  getDiaSemana,
  getSantiagoDateParts,
} from "./horario-timezone";

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

export interface AbiertoAhoraResponse {
  abierto: boolean;
  turno?: { apertura: string; cierre: string };
}

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
    this.assertGalleryLimit(dto.imagenes?.galeria, dto.planId);

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
      redesSociales: this.toPlain(dto.redesSociales),
      imagenes: dto.imagenes
        ? {
            logo: dto.imagenes.logo,
            portada: dto.imagenes.portada,
            galeria: dto.imagenes.galeria ?? [],
          }
        : { galeria: [] },
      planId: dto.planId,
      horarios: this.toPlainArray(dto.horarios),
      horariosEspeciales: this.toPlainArray(
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

    this.assertOwnership(existing, actor, "modificar este lugar");

    // Cross-catalog validation — diff-aware: only validate fields that are
    // being ADDED or CHANGED (skip when the DTO repeats the current value),
    // and only when the feature flag is enabled.
    if (this.catalogValidator.enabled) {
      if (dto.categoriaId && dto.categoriaId !== existing.categoriaId) {
        await this.catalogValidator.assertCategoriaActiva(dto.categoriaId);
      }
      if (
        dto.subcategoriaId &&
        dto.subcategoriaId !== existing.subcategoriaId
      ) {
        await this.catalogValidator.assertSubcategoriaActiva(
          dto.categoriaId ?? existing.categoriaId,
          dto.subcategoriaId,
        );
      }
      if (dto.barrioId && dto.barrioId !== existing.barrioId) {
        await this.catalogValidator.assertBarrioActivo(dto.barrioId);
      }
    }

    // Gallery limit per plan (use updated planId or fall back to existing)
    const effectivePlanId = dto.planId ?? existing.planId;
    if (dto.imagenes?.galeria) {
      this.assertGalleryLimit(dto.imagenes.galeria, effectivePlanId);
    }

    const patch = { ...dto } as unknown as Partial<Place>;

    // Convert nested DTO instances to plain objects for Firestore
    if (patch.imagenes) {
      patch.imagenes = {
        logo: patch.imagenes.logo,
        portada: patch.imagenes.portada,
        galeria: patch.imagenes.galeria ?? [],
      };
    }
    patch.redesSociales = this.toPlain(patch.redesSociales);
    patch.horarios = this.toPlainArray(patch.horarios);
    patch.horariosEspeciales = this.toPlainArray(patch.horariosEspeciales);

    // Regenerate slug if nombre changes
    if (dto.nombre && dto.nombre !== existing.nombre) {
      const newSlug = slugify(dto.nombre);
      const slugOwner = await this.placeRepo.findBySlug(newSlug);
      if (slugOwner && slugOwner.id !== id) {
        throw new ConflictException("Slug duplicado");
      }
      patch.slug = newSlug;
    }

    patch.updatedAt = new Date();

    return this.placeRepo.update(id, patch);
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async delete(id: string, actor: AuthContext): Promise<void> {
    const existing = await this.placeRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Place ${id} no encontrado`);
    }

    this.assertOwnership(existing, actor, "eliminar este lugar");

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

    // 24x7 always open
    if (place.abierto24x7) {
      return { abierto: true };
    }

    // Get current date parts in America/Santiago timezone
    const santiagoDate = getSantiagoDateParts(now);
    const diaSemana = getDiaSemana(santiagoDate.dayOfWeek);
    const currentTime = `${String(santiagoDate.hour).padStart(2, "0")}:${String(santiagoDate.minute).padStart(2, "0")}`;

    // Check horariosEspeciales first (overrides regular horario)
    const fechaStr = `${santiagoDate.year}-${String(santiagoDate.month).padStart(2, "0")}-${String(santiagoDate.day).padStart(2, "0")}`;
    const especial = place.horariosEspeciales?.find(
      (h) => h.fecha === fechaStr,
    );

    if (especial) {
      if (especial.turnos.length === 0) {
        return { abierto: false };
      }
      const turno = findMatchingTurno(especial.turnos, currentTime);
      return turno ? { abierto: true, turno } : { abierto: false };
    }

    // Regular horario
    const horarioDia = place.horarios?.find((h) => h.dia === diaSemana);
    if (!horarioDia || !horarioDia.abierto) {
      return { abierto: false };
    }

    const turno = findMatchingTurno(horarioDia.turnos, currentTime);
    return turno ? { abierto: true, turno } : { abierto: false };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private assertGalleryLimit(
    galeria: string[] | undefined,
    planId: string,
  ): void {
    const max = planId === "premium" ? 10 : 3;
    if (galeria && galeria.length > max) {
      throw new UnprocessableEntityException(
        `Plan ${planId} permite máximo ${max} imágenes en galería`,
      );
    }
  }

  private assertOwnership(
    place: Place,
    actor: AuthContext,
    action: string,
  ): void {
    if (actor.rol !== "admin" && place.usuarioId !== actor.uid) {
      throw new ForbiddenException(`No tienes permiso para ${action}`);
    }
  }

  // Converts class-validator DTO instances to plain objects for Firestore
  private toPlain<T>(value: T | undefined): T | undefined {
    if (value === undefined || value === null) return value;
    if (typeof value !== "object") return value;
    return JSON.parse(JSON.stringify(value));
  }

  private toPlainArray<T>(value: T[] | undefined): T[] | undefined {
    if (!value) return value;
    return JSON.parse(JSON.stringify(value));
  }
}
