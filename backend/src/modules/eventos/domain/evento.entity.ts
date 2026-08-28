/**
 * Core Evento entity — pure TypeScript, zero framework deps.
 *
 * Matches docs/data-model.md §eventos exactly.
 * Timestamps use `Date` in domain; Firestore adapter converts ↔ Timestamp.
 */
import type { EstadoVerificacion } from "./estado-verificacion";
import type { EventoEstado } from "./evento-estado.enum";
import type { PrecioTipo } from "./precio-tipo.enum";
import type { PrecioMoneda } from "./precio-moneda.enum";
import type { PublicoObjetivoEnum } from "./publico-objetivo.enum";
import type { AccesibilidadEnum } from "./accesibilidad.enum";
import type { NivelRuido } from "./nivel-ruido.enum";
import type { Coordenadas } from "./coordenadas.vo";
import type { Ubicacion } from "./ubicacion.vo";
import type { CambioEvento } from "./cambio-evento.interface";
import type { Modalidad } from "./modalidad.enum";

export interface Evento {
  // -- Identity --
  id: string;
  nombre: string;
  slug: string;

  // -- Descriptions --
  descripcionCorta: string;
  descripcion: string;

  // -- Taxonomy --
  categoriaId: string; // Always 'eventos' (set by system)
  subcategoriaId: string;
  barrioId: string;

  // -- Organizer --
  organizador: string;
  organizadorContacto?: string;
  organizadorWeb?: string;

  // -- Modality (how the evento is realized) --
  modalidad: Modalidad;

  // -- Location (own venue, independent of any place) --
  // REQUIRED when `modalidad !== 'online'`; undefined when `modalidad === 'online'`.
  ubicacion?: Ubicacion;

  // -- Schedule --
  fechaInicio: Date;
  fechaFin: Date;

  // -- Pricing --
  precioTipo: PrecioTipo;
  precioValor: number;
  precioMoneda: PrecioMoneda;

  // -- Capacity & Audience --
  capacidadMaxima?: number;
  publicoObjetivo: PublicoObjetivoEnum[];
  nivelRuido: NivelRuido;

  // -- Media --
  portada?: string;

  // -- Accessibility --
  accesibilidad?: AccesibilidadEnum[];

  // -- System / visibility & verification --
  activo: boolean; // public visibility flag (replaces legacy status)
  estadoVerificacion: EstadoVerificacion; // 'pendiente' | 'verificado' | 'rechazado'
  motivoRechazoVerificacion?: string; // required when estadoVerificacion === 'rechazado'
  cambios?: CambioEvento[]; // audit trail (populated when a verified evento is reverted to pendiente, or on any update where a field value actually changes)

  // -- Lifecycle (independent of verification) --
  estado: EventoEstado;
  destacado: boolean;
  usuarioId: string; // Firebase Auth UID of creator (REQUIRED, not in DTO)
  vistasTotales: number;
  createdAt: Date;
  updatedAt: Date;
  fechaPublicacion?: Date;
}
