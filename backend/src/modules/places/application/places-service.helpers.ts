/**
 * Stateless helpers for PlacesService.
 * Extracted here to keep places.service.ts under the 300-line SOLID threshold
 * and isolate pure/side-effect-free logic (SRP).
 */
import {
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Place } from "../domain/place.entity";
import type { AuthContext } from "../../auth/domain/auth-context.interface";
import type { CatalogValidator } from "../../categorias/application/catalog-validator.service";
import type { UpdatePlaceDto } from "./places.service";
import {
  findMatchingTurno,
  getDiaSemana,
  getSantiagoDateParts,
} from "./horario-timezone";

const MAX_GALERIA_FREE = 3;
const MAX_GALERIA_PREMIUM = 10;

/** Enforce gallery size per plan. Throws 422 when exceeded. */
export function assertGalleryLimit(
  galeria: string[] | undefined,
  planId: string,
): void {
  const max = planId === "premium" ? MAX_GALERIA_PREMIUM : MAX_GALERIA_FREE;
  if (galeria && galeria.length > max) {
    throw new UnprocessableEntityException(
      `Plan ${planId} permite máximo ${max} imágenes en galería`,
    );
  }
}

export function assertOwnership(
  place: Place,
  actor: AuthContext,
  action: string,
): void {
  if (actor.rol !== "admin" && place.usuarioId !== actor.uid) {
    throw new ForbiddenException(`No tienes permiso para ${action}`);
  }
}

export function toPlain<T>(value: T | undefined): T | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value));
}

export function toPlainArray<T>(value: T[] | undefined): T[] | undefined {
  if (!value) return value;
  return JSON.parse(JSON.stringify(value));
}

export async function validateCatalogReferences(
  catalogValidator: CatalogValidator,
  dto: UpdatePlaceDto,
  existing: Place,
): Promise<void> {
  if (dto.categoriaId && dto.categoriaId !== existing.categoriaId) {
    await catalogValidator.assertCategoriaActiva(dto.categoriaId);
  }
  if (dto.subcategoriaId && dto.subcategoriaId !== existing.subcategoriaId) {
    await catalogValidator.assertSubcategoriaActiva(
      dto.categoriaId ?? existing.categoriaId,
      dto.subcategoriaId,
    );
  }
  if (dto.barrioId && dto.barrioId !== existing.barrioId) {
    await catalogValidator.assertBarrioActivo(dto.barrioId);
  }
}

export function buildPlacePatch(dto: UpdatePlaceDto): Partial<Place> {
  const patch = { ...dto } as unknown as Partial<Place>;
  if (patch.imagenes) {
    patch.imagenes = {
      logo: patch.imagenes.logo,
      portada: patch.imagenes.portada,
      galeria: patch.imagenes.galeria ?? [],
    };
  }
  patch.redesSociales = toPlain(patch.redesSociales);
  patch.horarios = toPlainArray(patch.horarios);
  patch.horariosEspeciales = toPlainArray(patch.horariosEspeciales);
  return patch;
}

export interface AbiertoAhoraResponse {
  abierto: boolean;
  turno?: { apertura: string; cierre: string };
}

export function resolveAbiertoAhora(
  place: Place,
  now: Date,
): AbiertoAhoraResponse {
  if (place.abierto24x7) {
    return { abierto: true };
  }

  const santiagoDate = getSantiagoDateParts(now);
  const diaSemana = getDiaSemana(santiagoDate.dayOfWeek);
  const currentTime = `${String(santiagoDate.hour).padStart(2, "0")}:${String(santiagoDate.minute).padStart(2, "0")}`;

  const fechaStr = `${santiagoDate.year}-${String(santiagoDate.month).padStart(2, "0")}-${String(santiagoDate.day).padStart(2, "0")}`;
  const especial = place.horariosEspeciales?.find((h) => h.fecha === fechaStr);

  if (especial) {
    if (especial.turnos.length === 0) {
      return { abierto: false };
    }
    const turno = findMatchingTurno(especial.turnos, currentTime);
    return turno ? { abierto: true, turno } : { abierto: false };
  }

  const horarioDia = place.horarios?.find((h) => h.dia === diaSemana);
  if (!horarioDia || !horarioDia.abierto) {
    return { abierto: false };
  }

  const turno = findMatchingTurno(horarioDia.turnos, currentTime);
  return turno ? { abierto: true, turno } : { abierto: false };
}
