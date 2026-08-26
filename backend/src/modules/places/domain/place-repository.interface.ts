/**
 * Repository interface for the Place aggregate.
 * DIP: domain/application never import infrastructure — they depend on this.
 *
 * Max 5 methods per ISP rule; additional queries go through `search`.
 * `findSinDueno` and `countByUsuarioId` are separated because they serve
 * distinct use cases (admin orphan queue, deletion guard) that don't fit
 * into the generic search pipeline.
 *
 * Updated by places-refactor (CH-03): added `findSinDueno`, `countByUsuarioId`,
 * and updated `PlaceSearchFilters` with `activo`, `estadoVerificacion`, `sinDueno`.
 */
import type { Place } from "./place.entity";
import type { EstadoVerificacion } from "./estado-verificacion";

/** Filters for the search endpoint (GET /places). */
export interface PlaceSearchFilters {
  q?: string;
  categoriaId?: string;
  barrioId?: string;
  activo?: boolean;
  estadoVerificacion?: EstadoVerificacion;
  sinDueno?: boolean;
  page?: number;
  limit?: number;
}

/** Paginated result from Firestore cursor-based pagination. */
export interface PaginatedPlaces {
  data: Place[];
  nextCursor?: string;
  total: number;
}

export interface PlaceRepositoryInterface {
  findById(id: string): Promise<Place | null>;
  findBySlug(slug: string): Promise<Place | null>;
  search(filters: PlaceSearchFilters): Promise<PaginatedPlaces>;
  save(place: Omit<Place, "id" | "createdAt" | "updatedAt">): Promise<Place>;
  update(id: string, patch: Partial<Place>): Promise<Place>;
  delete(id: string): Promise<void>;
  findForMap(): Promise<
    Pick<Place, "id" | "nombre" | "slug" | "coordenadas" | "categoriaId">[]
  >;
  findSinDueno(filters?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedPlaces>;
  countByUsuarioId(usuarioId: string): Promise<number>;
}
