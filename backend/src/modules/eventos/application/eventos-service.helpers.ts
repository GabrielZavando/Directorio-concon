/**
 * Pure helpers for the Evento application service.
 *
 * Kept separate to honor the file-size SRP threshold (<=300 lines) for
 * `eventos.service.ts`. These functions take their collaborators as explicit
 * arguments (no hidden `this` dependency) so they stay trivially testable.
 */
import { ConflictException } from "@nestjs/common";
import type { Evento } from "../domain/evento.entity";
import type { CambioEvento } from "../domain/cambio-evento.interface";
import type { Ubicacion } from "../domain/ubicacion.vo";
import type { CatalogValidator } from "../../categorias/application/catalog-validator.service";

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
  ubicacion: Ubicacion;
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

/** Body for the admin verification endpoint. */
export interface VerificarEventoServiceDto {
  resultado: "verificado" | "rechazado";
  motivo?: string;
}

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
// Patch builder for updates (in-place; no staged solicitud)
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

  // DTO date fields arrive as ISO strings; the persistence layer expects
  // `Date` instances (Firestore Timestamps). Convert at this boundary so the
  // adapter never receives a raw string (which would crash dateToTimestamp).
  if (dto.fechaInicio) {
    patch.fechaInicio = new Date(dto.fechaInicio);
  }
  if (dto.fechaFin) {
    patch.fechaFin = new Date(dto.fechaFin);
  }

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
// Change diff — computes CambioEvento[] for the fields present in the DTO
// ---------------------------------------------------------------------------

export function computeChanges(
  existing: Evento,
  dto: UpdateEventoServiceDto,
  usuarioId: string,
): CambioEvento[] {
  const cambios: CambioEvento[] = [];
  const fecha = new Date();
  const keys = Object.keys(dto) as (keyof UpdateEventoServiceDto)[];

  for (const key of keys) {
    const nuevo = (dto as Record<string, unknown>)[key];
    if (nuevo === undefined) {
      continue;
    }
    const anterior = (existing as unknown as Record<string, unknown>)[key];
    // Date fields are supplied as ISO strings in the DTO but stored as `Date`
    // in the domain entity. Compare by value (getTime) so re-sending the same
    // instant does not produce a spurious `cambios` entry.
    const dateKeys = ["fechaInicio", "fechaFin", "fechaPublicacion"];
    const normalizedAnterior =
      dateKeys.includes(key as string) && anterior
        ? new Date(anterior as string | Date).getTime()
        : anterior;
    const normalizedNuevo =
      dateKeys.includes(key as string) && nuevo
        ? new Date(nuevo as string | Date).getTime()
        : nuevo;
    if (
      JSON.stringify(normalizedAnterior) !== JSON.stringify(normalizedNuevo)
    ) {
      cambios.push({
        campo: key as string,
        valorAnterior: anterior,
        valorNuevo: nuevo,
        fecha,
        usuarioId,
      });
    }
  }

  return cambios;
}
