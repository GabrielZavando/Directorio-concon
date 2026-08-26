/**
 * Application service for the Evento aggregate.
 *
 * Orchestrates domain logic: CRUD, slug generation, business-rules validation,
 * auto solicitud creation, and authorization checks.
 */
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  EventoRepositoryInterface,
  EventoSearchFilters,
  PaginatedEventos,
} from "../domain/evento-repository.interface";
import { EVENTO_REPOSITORY } from "../domain/evento-repository.token";
import type { Evento } from "../domain/evento.entity";
import type { SolicitudesServiceInterface } from "./solicitudes-service.interface";
import { EventoValidator } from "./evento-validator";
// Value import: CatalogValidator is used as a DI token, so it must be
// present at runtime (a type-only import would erase it and break DI).
import { CatalogValidator } from "../../categorias/application/catalog-validator.service";
import {
  CreateEventoServiceDto,
  UpdateEventoServiceDto,
  slugify,
  buildEventoPatch,
  stageApprovedUpdate,
  validateEventoCatalogReferences,
} from "./eventos-service.helpers";
import {
  assertFound,
  assertOwnerOrAdmin,
} from "../../../common/utils/assertions";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  /** Injection token for the solicitudes service (for binding in Task 8). */
  static readonly SOLICITUDES_SERVICE = "SolicitudesServiceInterface";

  constructor(
    @Inject(EVENTO_REPOSITORY)
    private readonly eventoRepo: EventoRepositoryInterface,
    @Inject(EventosService.SOLICITUDES_SERVICE)
    private readonly solicitudService: SolicitudesServiceInterface,
    private readonly eventoValidator: EventoValidator,
    private readonly catalogValidator: CatalogValidator,
  ) {}

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    dto: CreateEventoServiceDto,
    usuarioId: string,
  ): Promise<Evento> {
    // Validate cross-field business rules
    const validationErrors = await this.eventoValidator.validateCreate(dto);
    if (validationErrors.length > 0) {
      throw new UnprocessableEntityException(validationErrors);
    }

    const slug = slugify(dto.nombre);

    // Uniqueness check
    const existing = await this.eventoRepo.findBySlug(slug);
    if (existing) {
      throw new ConflictException("Slug duplicado");
    }

    // Cross-catalog validation (only when the feature flag is enabled).
    // Eventos always live under the constant `eventos` categoria; the
    // categoria check only fails if the seed did not run in this env.
    if (this.catalogValidator.enabled) {
      await this.catalogValidator.assertCategoriaActiva("eventos");
      await this.catalogValidator.assertSubcategoriaActiva(
        "eventos",
        dto.subcategoriaId,
      );
      await this.catalogValidator.assertBarrioActivo(dto.barrioId);
    }

    const now = new Date();
    const defaultCurrency = "CLP";

    // Persist evento
    const evento = await this.eventoRepo.create({
      nombre: dto.nombre,
      slug,
      descripcionCorta: dto.descripcionCorta,
      descripcion: dto.descripcion,
      categoriaId: "eventos",
      subcategoriaId: dto.subcategoriaId,
      barrioId: dto.barrioId,
      organizador: dto.organizador,
      organizadorContacto: dto.organizadorContacto,
      organizadorWeb: dto.organizadorWeb,
      ubicacionNombre: dto.ubicacionNombre,
      ubicacionDireccion: dto.ubicacionDireccion,
      coordenadas: dto.coordenadas,
      fechaInicio: new Date(dto.fechaInicio),
      fechaFin: new Date(dto.fechaFin),
      precioTipo: dto.precioTipo as Evento["precioTipo"],
      precioValor: dto.precioValor,
      precioMoneda: (dto.precioMoneda ??
        defaultCurrency) as Evento["precioMoneda"],
      capacidadMaxima: dto.capacidadMaxima,
      publicoObjetivo: dto.publicoObjetivo as Evento["publicoObjetivo"],
      nivelRuido: dto.nivelRuido as Evento["nivelRuido"],
      portada: dto.portada,
      accesibilidad: dto.accesibilidad as Evento["accesibilidad"],
      status: "pendiente",
      estado: "borrador",
      destacado: false,
      verificado: false,
      usuarioId,
      vistasTotales: 0,
    });

    // Auto-create solicitud
    await this.solicitudService.createEventoSolicitud({
      eventoId: evento.id,
      usuarioId,
      tipo: "registro-evento",
      status: "pendiente",
      createdAt: now,
    });

    this.logger.log(`Evento created: ${evento.id} (slug: ${slug})`);
    return evento;
  }

  // -------------------------------------------------------------------------
  // Read — public
  // -------------------------------------------------------------------------

  async findAllPublic(query: EventoSearchFilters): Promise<PaginatedEventos> {
    const filters: EventoSearchFilters = {
      ...query,
      estado: query.estado ?? "programado",
    };
    return this.eventoRepo.findAllPublic(filters);
  }

  async findOnePublic(id: string): Promise<Evento> {
    const evento = await this.eventoRepo.findById(id);
    if (!evento || evento.status !== "aprobado") {
      throw new NotFoundException(`Evento ${id} no encontrado`);
    }
    return evento;
  }

  async findBySlugPublic(slug: string): Promise<Evento> {
    const evento = await this.eventoRepo.findBySlug(slug);
    if (!evento || evento.status !== "aprobado") {
      throw new NotFoundException(`Evento con slug '${slug}' no encontrado`);
    }
    return evento;
  }

  async listMapData(): Promise<
    Pick<
      Evento,
      "id" | "nombre" | "slug" | "coordenadas" | "categoriaId" | "fechaInicio"
    >[]
  > {
    return this.eventoRepo.listMapData();
  }

  // -------------------------------------------------------------------------
  // Read — admin / owner (no status restriction)
  // -------------------------------------------------------------------------

  async findAllAdmin(query: EventoSearchFilters): Promise<PaginatedEventos> {
    return this.eventoRepo.findAllAdmin(query);
  }

  async findOne(id: string): Promise<Evento> {
    const evento = await this.eventoRepo.findById(id);
    if (!evento) {
      throw assertFound(evento, "Evento", id);
    }
    return evento;
  }

  async findBySlug(slug: string): Promise<Evento | null> {
    return this.eventoRepo.findBySlug(slug);
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  async update(
    id: string,
    dto: UpdateEventoServiceDto,
    usuarioId: string,
    rol: string,
  ): Promise<Evento> {
    const existing = await this.eventoRepo.findById(id);
    if (!existing) {
      throw assertFound(existing, "Evento", id);
    }

    if (rol !== "admin") {
      assertOwnerOrAdmin(
        { uid: usuarioId, rol },
        existing.usuarioId,
        "modificar este evento",
      );
    }

    if (this.catalogValidator.enabled) {
      await validateEventoCatalogReferences(
        dto,
        existing,
        this.catalogValidator,
      );
    }

    // If already approved, stage the change as a solicitud instead of mutating.
    if (existing.status === "aprobado") {
      return stageApprovedUpdate(id, dto, usuarioId, existing, {
        solicitudService: this.solicitudService,
        logger: this.logger,
      });
    }

    const patch = await buildEventoPatch(dto, existing, id, (slug) =>
      this.eventoRepo.findBySlug(slug),
    );
    return this.eventoRepo.update(id, patch);
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async remove(id: string, usuarioId: string, rol: string): Promise<void> {
    const existing = await this.eventoRepo.findById(id);
    if (!existing) {
      throw assertFound(existing, "Evento", id);
    }

    // Authorization: empresa owner or admin
    if (rol !== "admin") {
      assertOwnerOrAdmin(
        { uid: usuarioId, rol },
        existing.usuarioId,
        "eliminar este evento",
      );
    }

    // 409 if pending solicitudes exist
    const hasPending = await this.solicitudService.existsPendingByEventoId(id);
    if (hasPending) {
      throw new ConflictException(
        "No se puede eliminar: existen solicitudes pendientes asociadas a este evento",
      );
    }

    await this.eventoRepo.delete(id);
    this.logger.log(`Evento deleted: ${id}`);
  }
}
