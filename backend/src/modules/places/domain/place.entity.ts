/**
 * Core Place entity — pure TypeScript, zero framework deps.
 *
 * Matches docs/data-model.md §places exactly.
 * Timestamps use `Date` in domain; Firestore adapter converts ↔ Timestamp.
 */
import type { PlaceStatus } from "./place-status";
import type { ServicioEnum } from "./servicio.enum";
import type { MetodoPagoEnum } from "./metodo-pago.enum";
import type { Coordenadas } from "./coordenadas.vo";
import type { HorarioDia, HorarioEspecial } from "./horario-dia.vo";
import type { RedSocial } from "./red-social.vo";
import type { Imagenes } from "./imagenes.vo";
import type { ValoracionGoogle } from "./valoracion-google.vo";

export interface Place {
  // -- Identity --
  id: string;
  nombre: string;
  slug: string;

  // -- Descriptions --
  descripcionCorta: string;
  descripcion: string;

  // -- Taxonomy --
  categoriaId: string;
  subcategoriaId?: string;
  barrioId: string;

  // -- Contact & Location --
  direccion: string;
  coordenadas: Coordenadas;
  telefono?: string;
  whatsapp?: string;
  email?: string;
  sitioWeb?: string;

  // -- Social --
  redesSociales?: RedSocial[];
  imagenes: Imagenes;

  // -- Plans --
  planId: "gratuito" | "premium";

  // -- Schedule --
  horarios?: HorarioDia[];
  horariosEspeciales?: HorarioEspecial[];
  abierto24x7: boolean;

  // -- Services & Payment --
  servicios?: ServicioEnum[];
  metodosPago?: MetodoPagoEnum[];

  // -- Post-MVP placeholders --
  idiomas?: string[];
  vistasTotales: number;
  valoracionGoogle?: ValoracionGoogle;

  // -- System --
  status: PlaceStatus;
  verificado: boolean;
  fechaVerificacion?: Date;
  destacado: boolean;
  usuarioId?: string;
  fechaPublicacion?: Date;
  createdAt: Date;
  updatedAt: Date;
}
