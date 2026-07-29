/**
 * Repository interfaces for the Evento aggregate.
 *
 * Split into read and write interfaces (ISP: ≤5 methods each).
 * DIP: domain/application never import infrastructure — they depend on these.
 */
import type { Evento } from "./evento.entity";

/** Filters for the search endpoints (GET /eventos). */
export interface EventoSearchFilters {
  q?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  barrioId?: string;
  status?: string;
  estado?: string;
  precioTipo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  destacado?: boolean;
  page?: number;
  limit?: number;
}

/** Paginated result from Firestore cursor-based pagination. */
export interface PaginatedEventos {
  data: Evento[];
  nextCursor?: string;
  total: number;
}

// ---------------------------------------------------------------------------
// Read interface (≤5 methods)
// ---------------------------------------------------------------------------
export interface EventoReadRepositoryInterface {
  findAllPublic(filters: EventoSearchFilters): Promise<PaginatedEventos>;
  findAllAdmin(filters: EventoSearchFilters): Promise<PaginatedEventos>;
  findById(id: string): Promise<Evento | null>;
  findBySlug(slug: string): Promise<Evento | null>;
  listMapData(): Promise<
    Pick<
      Evento,
      "id" | "nombre" | "slug" | "coordenadas" | "categoriaId" | "fechaInicio"
    >[]
  >;
}

// ---------------------------------------------------------------------------
// Write interface (≤3 methods)
// ---------------------------------------------------------------------------
export interface EventoWriteRepositoryInterface {
  create(
    evento: Omit<Evento, "id" | "createdAt" | "updatedAt">,
  ): Promise<Evento>;
  update(id: string, patch: Partial<Evento>): Promise<Evento>;
  delete(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Combined interface (convenience for the service)
// ---------------------------------------------------------------------------
export interface EventoRepositoryInterface
  extends EventoReadRepositoryInterface,
    EventoWriteRepositoryInterface {}
