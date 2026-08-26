/**
 * Core Place entity — pure TypeScript, zero framework deps.
 *
 * Matches docs/data-model.md §places exactly.
 * Timestamps use `Date` in domain; Firestore adapter converts ↔ Timestamp.
 *
 * Updated by places-refactor (CH-03): replaced `status` + `verificado`
 * with `activo` + `estadoVerificacion`. `usuarioId` is now REQUIRED.
 */
import type { EstadoVerificacion } from "./estado-verificacion";
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

  // -- Lifecycle (places-refactor CH-03) --
  activo: boolean;
  estadoVerificacion: EstadoVerificacion;
  motivoRechazoVerificacion?: string;
  gestionadoPorAdmin: boolean;

  // -- System --
  destacado: boolean;
  usuarioId: string;
  fechaPublicacion?: Date;
  createdAt: Date;
  updatedAt: Date;
}
