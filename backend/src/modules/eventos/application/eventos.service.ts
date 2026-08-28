/**
 * Application service for the Evento aggregate.
 *
 * Orchestrates domain logic: CRUD, slug generation, business-rules validation,
 * and authorization checks. No longer depends on the `solicitudes` module —
 * eventos are visible immediately upon creation and edited in-place (with a
 * possible reversion to `pendiente` when a verified evento is edited).
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type {
  EventoMapDataItem,
  EventoRepositoryInterface,
  EventoSearchFilters,
  PaginatedEventos,
} from "../domain/evento-repository.interface";
import { EVENTO_REPOSITORY } from "../domain/evento-repository.token";
import type { Evento } from "../domain/evento.entity";
import type { NotificacionesPort } from "./notificaciones.port";
import { NOTIFICACIONES_PORT } from "./notificaciones.port";
import { EventoValidator } from "./evento-validator";
// Value import: CatalogValidator is used as a DI token, so it must be
// present at runtime (a type-only import would erase it and break DI).
import { CatalogValidator } from "../../categorias/application/catalog-validator.service";
import {
  CreateEventoServiceDto,
  UpdateEventoServiceDto,
  slugify,
  buildEventoPatch,
  computeChanges,
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

  constructor(
    @Inject(EVENTO_REPOSITORY)
    private readonly eventoRepo: EventoRepositoryInterface,
    private readonly eventoValidator: EventoValidator,
    private readonly catalogValidator: CatalogValidator,
    @Inject(NOTIFICACIONES_PORT)
    private readonly notificacionesPort: NotificacionesPort,
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
      throw new BadRequestException(validationErrors);
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

    // Persist evento — visible immediately, no auto solicitud.
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
      modalidad: dto.modalidad as Evento["modalidad"],
      ubicacion: dto.ubicacion,
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
      activo: true,
      estadoVerificacion: "pendiente",
      cambios: [],
      estado: "programado",
      destacado: false,
      usuarioId,
      vistasTotales: 0,
    });

    this.logger.log(`Evento created: ${evento.id} (slug: ${slug})`);
    return evento;
  }

  // -------------------------------------------------------------------------
  // Read — public
  // -------------------------------------------------------------------------

  async findAllPublic(query: EventoSearchFilters): Promise<PaginatedEventos> {
    // Public listing is always scoped to active eventos (regardless of
    // estadoVerificacion — a pending evento is publicly visible immediately).
    // The `estadoVerificacion` filter is only applied when the caller passes it
    // (e.g. the admin verification queue `?estadoVerificacion=pendiente`).
    const filters: EventoSearchFilters = {
      ...query,
      estado: query.estado ?? "programado",
      activo: true,
    };
    return this.eventoRepo.findAllPublic(filters);
  }

  async findOnePublic(id: string): Promise<Evento> {
    const evento = await this.eventoRepo.findById(id);
    if (!evento || !evento.activo) {
      throw new NotFoundException(`Evento ${id} no encontrado`);
    }
    return evento;
  }

  async findBySlugPublic(slug: string): Promise<Evento> {
    const evento = await this.eventoRepo.findBySlug(slug);
    if (!evento || !evento.activo) {
      throw new NotFoundException(`Evento con slug '${slug}' no encontrado`);
    }
    return evento;
  }

  async listMapData(): Promise<EventoMapDataItem[]> {
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
  // Update — unified in-place; reverts verified -> pendiente
  // -------------------------------------------------------------------------

  async update(
    id: string,
    dto: UpdateEventoServiceDto,
    usuarioId: string,
    rol: string,
  ): Promise<Evento> {
    const existing = await this.eventoRepo.findById(id);
    assertFound(existing, "Evento", id);

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

    const patch = await buildEventoPatch(dto, existing, id, (slug) =>
      this.eventoRepo.findBySlug(slug),
    );

    // If the evento was verified, editing it reverts verification to pendiente
    // (simple reversion — Decision #4) and records the diff in cambios[].
    const eraVerificado = existing.estadoVerificacion === "verificado";
    const updates: Partial<Evento> & { updatedAt: Date } = { ...patch };
    if (eraVerificado) {
      updates.estadoVerificacion = "pendiente";
      const cambios = computeChanges(existing, patch, usuarioId);
      updates.cambios = [...(existing.cambios ?? []), ...cambios];
      await this.notificacionesPort.notifyEventoRevertidoPendiente(
        existing,
        cambios,
      );
      this.logger.log(
        `Evento ${id} reverted to pendiente after edit by ${usuarioId}`,
      );
    }

    return this.eventoRepo.update(id, updates);
  }

  // -------------------------------------------------------------------------
  // Admin verification
  // -------------------------------------------------------------------------

  async verificar(
    id: string,
    resultado: "verificado" | "rechazado",
    _adminUid: string,
    motivo?: string,
  ): Promise<Evento> {
    const existing = await this.eventoRepo.findById(id);
    assertFound(existing, "Evento", id);

    if (resultado === "verificado") {
      this.logger.log(`Evento ${id} verified by admin`);
      // Verifying makes the evento publicly visible: ensure `activo` is true
      // (a previously rejected evento was set inactive) and clear any prior
      // rejection reason.
      return this.eventoRepo.update(id, {
        estadoVerificacion: "verificado",
        fechaPublicacion: new Date(),
        activo: true,
        motivoRechazoVerificacion: undefined,
        updatedAt: new Date(),
      });
    }

    if (resultado === "rechazado") {
      if (!motivo) {
        throw new BadRequestException(
          "motivo is required when resultado is 'rechazado'",
        );
      }
      this.logger.log(`Evento ${id} rejected by admin`);
      return this.eventoRepo.update(id, {
        estadoVerificacion: "rechazado",
        activo: false,
        motivoRechazoVerificacion: motivo,
        updatedAt: new Date(),
      });
    }

    throw new BadRequestException("resultado inválido");
  }

  // -------------------------------------------------------------------------
  // Delete — soft delete (activo:false)
  // -------------------------------------------------------------------------

  async remove(id: string, usuarioId: string, rol: string): Promise<Evento> {
    const existing = await this.eventoRepo.findById(id);
    assertFound(existing, "Evento", id);

    // Authorization: owner or admin
    if (rol !== "admin") {
      assertOwnerOrAdmin(
        { uid: usuarioId, rol },
        existing.usuarioId,
        "eliminar este evento",
      );
    }

    const updated = await this.eventoRepo.update(id, {
      activo: false,
      updatedAt: new Date(),
    });
    this.logger.log(`Evento soft-deleted: ${id}`);
    return updated;
  }
}
