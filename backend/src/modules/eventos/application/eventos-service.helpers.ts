/**
 * Pure helpers for the Evento application service.
 *
 * Kept separate to honor the file-size SRP threshold (<=300 lines) for
 * `eventos.service.ts`. These functions take their collaborators as explicit
 * arguments (no hidden `this` dependency) so they stay trivially testable.
 */
import { ConflictException, Logger } from "@nestjs/common";
import type { Evento } from "../domain/evento.entity";
import type { CatalogValidator } from "../../categorias/application/catalog-validator.service";
import type { SolicitudesServiceInterface } from "./solicitudes-service.interface";

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

export function slugify(text: string): string {
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
// Catalog references validation (uses injected CatalogValidator)
// ---------------------------------------------------------------------------

export async function validateEventoCatalogReferences(
  dto: UpdateEventoServiceDto,
  existing: Evento,
  catalogValidator: CatalogValidator,
): Promise<void> {
  if (dto.subcategoriaId && dto.subcategoriaId !== existing.subcategoriaId) {
    await catalogValidator.assertSubcategoriaActiva(
      "eventos",
      dto.subcategoriaId,
    );
  }
  if (dto.barrioId && dto.barrioId !== existing.barrioId) {
    await catalogValidator.assertBarrioActivo(dto.barrioId);
  }
}

// ---------------------------------------------------------------------------
// Patch builder for non-approved updates
// ---------------------------------------------------------------------------

export async function buildEventoPatch(
  dto: UpdateEventoServiceDto,
  existing: Evento,
  id: string,
  findBySlug: (slug: string) => Promise<Evento | null>,
): Promise<Partial<Evento> & { updatedAt: Date }> {
  const patch = {
    ...dto,
    updatedAt: new Date(),
  } as unknown as Partial<Evento> & { updatedAt: Date };

  if (dto.nombre && dto.nombre !== existing.nombre) {
    const newSlug = slugify(dto.nombre);
    const slugOwner = await findBySlug(newSlug);
    if (slugOwner && slugOwner.id !== id) {
      throw new ConflictException("Slug duplicado");
    }
    patch.slug = newSlug;
  }

  return patch;
}

// ---------------------------------------------------------------------------
// Staged update for already-approved eventos (creates a solicitud)
// ---------------------------------------------------------------------------

export async function stageApprovedUpdate(
  id: string,
  dto: UpdateEventoServiceDto,
  usuarioId: string,
  existing: Evento,
  collaborators: {
    solicitudService: SolicitudesServiceInterface;
    logger: Logger;
  },
): Promise<Evento> {
  const { solicitudService, logger } = collaborators;
  const now = new Date();
  await solicitudService.createEventoSolicitud({
    eventoId: id,
    usuarioId,
    tipo: "actualizacion-evento",
    status: "pendiente",
    proposal: dto as Record<string, unknown>,
    createdAt: now,
  });

  logger.log(
    `Evento update staged via solicitud: ${id} (${JSON.stringify(dto)})`,
  );
  return existing;
}
