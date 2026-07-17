import type { EmpresaStatus } from "./empresa-status";
import type { Timestamp } from "firebase-admin/firestore";

export interface Empresa {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  categoriaId: string;
  barrioId: string;
  direccion: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  redesSociales?: unknown[];
  planId: string;
  horarios?: string;
  servicios?: string[];
  coordenadas?: { lat: number; lng: number };
  logoUrl?: string;
  destacado: boolean;
  verificado: boolean;
  status: EmpresaStatus;
  usuarioId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
