/**
 * Application service for the Evento aggregate.
 *
 * Orchestrates domain logic: CRUD, slug generation, business-rules validation,
 * auto solicitud creation, and authorization checks.
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
import type {
  EventoRepositoryInterface,
  EventoSearchFilters,
  PaginatedEventos,
} from "../domain/evento-repository.interface";
import { EVENTO_REPOSITORY } from "../domain/evento-repository.token";
import type { Evento } from "../domain/evento.entity";
import type { SolicitudesServiceInterface } from "./solicitudes-service.interface";
import { EventoValidator } from "./evento-validator";

// ---------------------------------------------------------------------------
// DTO types (mirrors what the controller receives after validation)
// ---------------------------------------------------------------------------

export interface CreateEventoServiceDto {
  nombre: string;
  descripcionCorta: string;
  descripcion: string;
  subcategoriaId: string;
  barrioId: string;
  organizador: string;
  organizadorContacto?: string;
  organizadorWeb?: string;
  ubicacionNombre?: string;
  ubicacionDireccion: string;
  coordenadas: { lat: number; lng: number };
  fechaInicio: string;
  fechaFin: string;
  precioTipo: string;
  precioValor: number;
  precioMoneda?: string;
  capacidadMaxima?: number;
  publicoObjetivo: string[];
  nivelRuido: string;
  portada?: string;
  accesibilidad?: string[];
}

export type UpdateEventoServiceDto = Partial<CreateEventoServiceDto>;

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
      throw new NotFoundException(`Evento ${id} no encontrado`);
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
      throw new NotFoundException(`Evento ${id} no encontrado`);
    }

    // Authorization: empresa owner or admin
    if (rol !== "admin" && existing.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        "No tienes permiso para modificar este evento",
      );
    }

    // If status is aprobado, create solicitud instead of applying in-place
    if (existing.status === "aprobado") {
      const now = new Date();
      await this.solicitudService.createEventoSolicitud({
        eventoId: id,
        usuarioId,
        tipo: "actualizacion-evento",
        status: "pendiente",
        proposal: dto as Record<string, unknown>,
        createdAt: now,
      });

      this.logger.log(
        `Evento update staged via solicitud: ${id} (${JSON.stringify(dto)})`,
      );
      return existing; // Return unchanged evento (patch staged for admin approval)
    }

    // Otherwise (pendiente or rechazado), apply in-place
    const patch: Partial<Evento> & { updatedAt: Date } = {
      ...dto,
      updatedAt: new Date(),
    } as unknown as Partial<Evento> & { updatedAt: Date };

    // Regenerate slug if nombre changes
    if (dto.nombre && dto.nombre !== existing.nombre) {
      const newSlug = slugify(dto.nombre);
      const slugOwner = await this.eventoRepo.findBySlug(newSlug);
      if (slugOwner && slugOwner.id !== id) {
        throw new ConflictException("Slug duplicado");
      }
      patch.slug = newSlug;
    }

    return this.eventoRepo.update(id, patch);
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async remove(id: string, usuarioId: string, rol: string): Promise<void> {
    const existing = await this.eventoRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Evento ${id} no encontrado`);
    }

    // Authorization: empresa owner or admin
    if (rol !== "admin" && existing.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar este evento",
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
