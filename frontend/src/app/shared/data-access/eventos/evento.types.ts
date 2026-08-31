/* ------------------------------------------------------------------ */
/*  Evento domain types — mirror of docs/api/api-spec.yml Evento schema   */
/*  Generated manually (openapi-generator is Non-Goal per design.md)   */
/* ------------------------------------------------------------------ */

// ── Enums & literal unions ──────────────────────────────────────────

export type PrecioTipo = 'gratis' | 'pago' | 'donacion' | 'invitacion';
export type PrecioMoneda = 'CLP' | 'USD';
export type PublicoObjetivo =
  | 'familia'
  | 'adultos'
  | 'tercera_edad'
  | 'mascotas'
  | 'todos'
  | 'ninos'
  | 'adolescentes';
export type NivelRuido = 'bajo' | 'medio' | 'alto';
export type AccesibilidadItem =
  | 'acceso-silla-ruedas'
  | 'banos-accesibles'
  | 'estacionamiento-reservado'
  | 'interprete-senas'
  | 'material-braille'
  | 'rampa-acceso';
export type EventoStatus = 'pendiente' | 'aprobado' | 'rechazado';
export type EventoEstado =
  | 'borrador'
  | 'programado'
  | 'en_curso'
  | 'finalizado'
  | 'cancelado'
  | 'suspendido';

// ── Value objects ───────────────────────────────────────────────────

export interface Coordenadas {
  lat: number;
  lng: number;
}

// ── Main entity ─────────────────────────────────────────────────────

export interface Evento {
  id: string;
  slug: string;
  nombre: string;
  descripcionCorta: string;
  descripcion: string;
  categoriaId: string;
  subcategoriaId: string;
  barrioId: string;
  organizador: string;
  organizadorContacto: string | null;
  organizadorWeb: string | null;
  ubicacionNombre: string | null;
  ubicacionDireccion: string;
  coordenadas: Coordenadas;
  fechaInicio: string; // ISO date-time
  fechaFin: string; // ISO date-time
  precioTipo: PrecioTipo;
  precioValor: number;
  precioMoneda: PrecioMoneda;
  capacidadMaxima: number | null;
  publicoObjetivo: PublicoObjetivo[];
  nivelRuido: NivelRuido;
  portada: string | null;
  accesibilidad: AccesibilidadItem[];
  status: EventoStatus;
  estado: EventoEstado;
  destacado: boolean;
  verificado: boolean;
  placeId: string | null;
  usuarioId: string;
  vistasTotales: number;
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
  fechaPublicacion: string | null; // ISO date-time
}

// ── DTOs ────────────────────────────────────────────────────────────

export interface CreateEvento {
  nombre: string;
  descripcionCorta: string;
  descripcion: string;
  subcategoriaId: string;
  barrioId: string;
  organizador: string;
  organizadorContacto?: string | null;
  organizadorWeb?: string | null;
  ubicacionNombre?: string | null;
  ubicacionDireccion: string;
  coordenadas: Coordenadas;
  fechaInicio: string;
  fechaFin: string;
  precioTipo: PrecioTipo;
  precioValor: number;
  precioMoneda?: PrecioMoneda;
  capacidadMaxima?: number | null;
  publicoObjetivo: PublicoObjetivo[];
  nivelRuido: NivelRuido;
  portada?: string | null;
  accesibilidad?: AccesibilidadItem[];
  placeId?: string | null;
}

export interface UpdateEvento {
  nombre?: string;
  descripcionCorta?: string;
  descripcion?: string;
  organizador?: string;
  organizadorContacto?: string | null;
  organizadorWeb?: string | null;
  ubicacionNombre?: string | null;
  ubicacionDireccion?: string;
  coordenadas?: Coordenadas;
  fechaInicio?: string;
  fechaFin?: string;
  precioTipo?: PrecioTipo;
  precioValor?: number;
  precioMoneda?: PrecioMoneda;
  capacidadMaxima?: number | null;
  publicoObjetivo?: PublicoObjetivo[];
  nivelRuido?: NivelRuido;
  portada?: string | null;
  accesibilidad?: AccesibilidadItem[];
  destacado?: boolean;
  verificado?: boolean;
  placeId?: string | null;
}

// ── Map data (lightweight for markers) ─────────────────────────────

export interface EventoMapDataItem {
  id: string;
  slug: string;
  nombre: string;
  coordenadas: Coordenadas;
  subcategoriaId: string;
  barrioId: string;
  fechaInicio: string;
}

// ── Query filters ───────────────────────────────────────────────────

export interface EventoQuery {
  page?: number;
  limit?: number;
  q?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  barrioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  precioTipo?: PrecioTipo;
  estado?: EventoEstado;
  destacado?: boolean;
}

// ── API response wrappers (mirror of TransformInterceptor) ──────────

export interface ApiMeta {
  timestamp?: string;
  path?: string;
  method?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: ApiMeta;
}
