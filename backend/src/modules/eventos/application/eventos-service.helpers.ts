/**
 * Pure helpers for the Evento application service.
 *
 * Kept separate to honor the file-size SRP threshold (<=300 lines) for
 * `eventos.service.ts`. These functions take their collaborators as explicit
 * arguments (no hidden `this` dependency) so they stay trivially testable.
 */
import { BadRequestException, ConflictException } from "@nestjs/common";
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
  modalidad: string;
  // REQUIRED for presencial/hibrido; undefined for online (validated at HTTP layer).
  ubicacion?: Ubicacion;
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

  // Switching to `online` clears any previously stored venue (the adapter will
  // delete the Firestore field). The HTTP-layer validator guarantees ubicacion
  // is absent in the request when modalidad === 'online' on CREATE; for UPDATE
  // we must also protect an *existing* online evento from acquiring a venue via
  // a partial PUT that omits `modalidad` (the cross-field constraint only fires
  // when `modalidad` is present in the body).
  const effectiveModalidad = (dto.modalidad ?? existing.modalidad) as string;
  if (dto.ubicacion !== undefined && effectiveModalidad === "online") {
    throw new BadRequestException("online events must not include ubicacion");
  }
  if (dto.modalidad === "online") {
    (patch as Record<string, unknown>).ubicacion = null;
  }

  return patch;
}

// ---------------------------------------------------------------------------
// Change diff — computes CambioEvento[] for the fields changed by the update
// ---------------------------------------------------------------------------

/**
 * Two `Ubicacion` values are equal when their coordinates and optional text
 * fields match. Compared semantically (not by JSON key order) so re-sending the
 * same venue serialized in a different key order does not emit a spurious cambio.
 */
function ubicacionesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ua = a as Ubicacion;
  const ub = b as Ubicacion;
  return (
    ua.nombreLugar === ub.nombreLugar &&
    ua.direccion === ub.direccion &&
    ua.coordenadas?.lat === ub.coordenadas?.lat &&
    ua.coordenadas?.lng === ub.coordenadas?.lng
  );
}

/**
 * Compares the existing evento against the *resulting patch* (already normalized
 * by `buildEventoPatch`) so that fields the service mutates implicitly — e.g.
 * clearing `ubicacion` when an evento transitions to `online` — are also recorded
 * in the audit trail. `updatedAt` and `cambios` are excluded (managed by the
 * service, never user-driven diffs).
 */
export function computeChanges(
  existing: Evento,
  patch: Record<string, unknown>,
  usuarioId: string,
): CambioEvento[] {
  const cambios: CambioEvento[] = [];
  const fecha = new Date();
  const ignoreKeys = new Set(["updatedAt", "cambios"]);
  const keys = Object.keys(patch);

  for (const key of keys) {
    if (ignoreKeys.has(key)) {
      continue;
    }
    const valorNuevo = patch[key];
    if (valorNuevo === undefined) {
      continue;
    }
    const valorAnterior = (existing as unknown as Record<string, unknown>)[key];

    if (key === "ubicacion") {
      if (!ubicacionesEqual(valorAnterior, valorNuevo)) {
        cambios.push({
          campo: "ubicacion",
          valorAnterior,
          valorNuevo,
          fecha,
          usuarioId,
        });
      }
      continue;
    }

    // Date fields are stored as `Date` in the domain entity. Compare by value
    // (getTime) so re-sending the same instant does not produce a spurious
    // `cambios` entry.
    const dateKeys = ["fechaInicio", "fechaFin", "fechaPublicacion"];
    const normalizedAnterior =
      dateKeys.includes(key) && valorAnterior
        ? new Date(valorAnterior as string | Date).getTime()
        : valorAnterior;
    const normalizedNuevo =
      dateKeys.includes(key) && valorNuevo
        ? new Date(valorNuevo as string | Date).getTime()
        : valorNuevo;
    if (
      JSON.stringify(normalizedAnterior) !== JSON.stringify(normalizedNuevo)
    ) {
      cambios.push({
        campo: key,
        valorAnterior,
        valorNuevo,
        fecha,
        usuarioId,
      });
    }
  }

  return cambios;
}
