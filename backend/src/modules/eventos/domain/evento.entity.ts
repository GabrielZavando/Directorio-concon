/**
 * Core Evento entity — pure TypeScript, zero framework deps.
 *
 * Matches docs/data-model.md §eventos exactly.
 * Timestamps use `Date` in domain; Firestore adapter converts ↔ Timestamp.
 */
import type { EventoStatus } from "./evento-status.enum";
import type { EventoEstado } from "./evento-estado.enum";
import type { PrecioTipo } from "./precio-tipo.enum";
import type { PrecioMoneda } from "./precio-moneda.enum";
import type { PublicoObjetivoEnum } from "./publico-objetivo.enum";
import type { AccesibilidadEnum } from "./accesibilidad.enum";
import type { NivelRuido } from "./nivel-ruido.enum";
import type { Coordenadas } from "./coordenadas.vo";

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

  // -- Location --
  ubicacionNombre?: string;
  ubicacionDireccion: string;
  coordenadas: Coordenadas;

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

  // -- System --
  status: EventoStatus;
  estado: EventoEstado;
  destacado: boolean;
  verificado: boolean;
  placeId?: string;
  usuarioId: string; // Firebase Auth UID of creator (REQUIRED, not in DTO)
  vistasTotales: number;
  createdAt: Date;
  updatedAt: Date;
  fechaPublicacion?: Date;
}
