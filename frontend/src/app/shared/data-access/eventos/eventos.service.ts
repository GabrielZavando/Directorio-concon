import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Evento,
  CreateEvento,
  UpdateEvento,
  EventoMapDataItem,
  EventoQuery,
  ApiResponse,
} from './evento.types';

/**
 * EventosService — data-access layer for the Eventos API.
 *
 * All methods return cold Observables. The caller is responsible for
 * subscribing (and unsubscribing). Auth headers (x-usuario-id, x-rol)
 * are NOT set here; they are handled by an HTTP interceptor or the
 * caller (matching the backend stub pattern).
 */
@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/eventos';

  // ── Public list (only approved) ─────────────────────────────────

  /**
   * Fetch paginated public eventos. Filters passed via query params.
   */
  list(query: EventoQuery): Observable<ApiResponse<Evento[]>> {
    const params = this.buildParams(query, { page: 1, limit: 20 });
    return this.http.get<ApiResponse<Evento[]>>(this.baseUrl, { params });
  }

  // ── Single by ID ────────────────────────────────────────────────

  /** Get a single evento by Firestore ID (public, must be approved). */
  getById(id: string): Observable<ApiResponse<Evento>> {
    return this.http.get<ApiResponse<Evento>>(`${this.baseUrl}/${id}`);
  }

  // ── Single by slug ──────────────────────────────────────────────

  /** Get a single evento by slug (public, must be approved). */
  getBySlug(slug: string): Observable<ApiResponse<Evento>> {
    return this.http.get<ApiResponse<Evento>>(
      `${this.baseUrl}/slug/${encodeURIComponent(slug)}`,
    );
  }

  // ── Map data (lightweight) ──────────────────────────────────────

  /** Get lightweight evento list for map markers. */
  mapData(): Observable<EventoMapDataItem[]> {
    return this.http.get<EventoMapDataItem[]>(`${this.baseUrl}/map-data`);
  }

  // ── Create ──────────────────────────────────────────────────────

  /** Create a new evento. Auth headers (x-usuario-id) must be set by caller/interceptor. */
  create(dto: CreateEvento): Observable<ApiResponse<Evento>> {
    return this.http.post<ApiResponse<Evento>>(this.baseUrl, dto);
  }

  // ── Update ──────────────────────────────────────────────────────

  /** Update an existing evento. Auth headers must be set by caller/interceptor. */
  update(
    id: string,
    dto: UpdateEvento,
  ): Observable<ApiResponse<Evento>> {
    return this.http.put<ApiResponse<Evento>>(
      `${this.baseUrl}/${id}`,
      dto,
    );
  }

  // ── Delete ──────────────────────────────────────────────────────

  /** Delete an evento. Auth headers must be set by caller/interceptor. */
  remove(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  // ── My eventos (empresa) ────────────────────────────────────────

  /**
   * Fetch eventos owned by a specific usuarioId.
   * The backend uses the same GET /eventos endpoint with filters.
   */
  misEventos(usuarioId: string): Observable<ApiResponse<Evento[]>> {
    const params = this.buildParams({ page: 1, limit: 100 })
      .set('usuarioId', usuarioId);
    return this.http.get<ApiResponse<Evento[]>>(this.baseUrl, { params });
  }

  // ── Admin list ──────────────────────────────────────────────────

  /**
   * Fetch all eventos (all statuses). Intended for admin use.
   * The caller must set x-rol: admin header.
   */
  adminList(): Observable<ApiResponse<Evento[]>> {
    const params = this.buildParams({ page: 1, limit: 50 });
    return this.http.get<ApiResponse<Evento[]>>(this.baseUrl, { params });
  }

  // ── Private helpers ─────────────────────────────────────────────

  /**
   * Build HttpParams from an EventoQuery, applying defaults for
   * missing optional fields.
   */
  private buildParams(
    query: EventoQuery,
    defaults: { page: number; limit: number } = { page: 1, limit: 20 },
  ): HttpParams {
    let params = new HttpParams()
      .set('page', (query.page ?? defaults.page).toString())
      .set('limit', (query.limit ?? defaults.limit).toString());

    const optionalFields: Array<keyof EventoQuery> = [
      'q',
      'subcategoriaId',
      'barrioId',
      'fechaDesde',
      'fechaHasta',
      'precioTipo',
      'estado',
    ];

    for (const field of optionalFields) {
      const value = query[field];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(field, String(value));
      }
    }

    if (query.destacado !== undefined && query.destacado !== null) {
      params = params.set('destacado', String(query.destacado));
    }

    return params;
  }
}
