/**
 * Repository interface for the Place aggregate.
 * DIP: domain/application never import infrastructure — they depend on this.
 *
 * Max 5 methods (ISP). Additional queries go through `search`.
 */
import type { Place } from "./place.entity";

/** Filters for the search endpoint (GET /places). */
export interface PlaceSearchFilters {
  q?: string;
  categoriaId?: string;
  barrioId?: string;
  status?: string;
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
}
