/**
 * Minimal repository interface for Solicitudes, consumed by PlacesService.
 *
 * The full Solicitudes module will be implemented separately. This interface
 * defines only the methods needed by the places feature (DIP: places depends
 * on this abstraction, not on a concrete solicitudes implementation).
 */
export interface Solicitud {
  id: string;
  placeId: string;
  usuarioId: string;
  tipo: "registro" | "actualizacion";
  status: "pendiente" | "aprobado" | "rechazado";
  comentarios?: string;
  revisadoPor?: string;
  createdAt: Date;
  revisadoAt?: Date;
}

export interface CreateSolicitudInput {
  placeId: string;
  usuarioId: string;
  tipo: "registro" | "actualizacion";
  status: "pendiente";
  createdAt: Date;
}

export interface SolicitudesRepositoryInterface {
  create(input: CreateSolicitudInput): Promise<Solicitud>;
  existsByPlaceId(placeId: string): Promise<boolean>;
}
