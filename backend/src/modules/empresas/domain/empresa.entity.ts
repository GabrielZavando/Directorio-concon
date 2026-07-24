import type { EmpresaStatus } from "./empresa-status";

/**
 * Core domain entity for a business listing.
 *
 * Pure TypeScript — no framework imports.
 * Timestamps use plain Date (the infrastructure adapter converts
 * Firebase Timestamp ↔ Date).
 */
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
  createdAt: Date;
  updatedAt: Date;
}
