/**
 * Mapping between the Evento domain entity and its Firestore document shape.
 * Kept in a dedicated module so the adapter stays focused on query orchestration
 * (SRP) and the file respects the 300-line threshold.
 */
import type { FirebaseService } from "@/common/services/firebase.service";
import type { Timestamp } from "firebase-admin/firestore";
import type { Evento } from "../domain/evento.entity";
import type { Ubicacion } from "../domain/ubicacion.vo";
import { isModalidad } from "../domain/modalidad.enum";

export interface EventoFirestoreDoc {
  id: string;
  nombre: string;
  slug: string;
  descripcionCorta: string;
  descripcion: string;
  categoriaId: string;
  subcategoriaId?: string;
  barrioId: string;
  organizador: string;
  organizadorContacto?: string;
  organizadorWeb?: string;
  modalidad?: string;
  ubicacion?: {
    nombreLugar?: string;
    direccion?: string;
    coordenadas: { lat: number; lng: number };
  };
  fechaInicio: unknown;
  fechaFin: unknown;
  precioTipo: string;
  precioValor: number;
  precioMoneda: string;
  capacidadMaxima?: number;
  publicoObjetivo: string[];
  nivelRuido: string;
  portada?: string;
  accesibilidad?: string[];
  estado: string;
  destacado: boolean;
  estadoVerificacion: string;
  activo: boolean;
  usuarioId: string;
  vistasTotales: number;
  cambios: unknown[];
  createdAt: unknown;
  updatedAt: unknown;
  fechaPublicacion?: unknown;
}

export function toEventoDomain(
  firebase: FirebaseService,
  id: string,
  doc: EventoFirestoreDoc,
): Evento {
  return {
    id,
    nombre: doc.nombre,
    slug: doc.slug,
    descripcionCorta: doc.descripcionCorta,
    descripcion: doc.descripcion,
    categoriaId: doc.categoriaId,
    subcategoriaId: doc.subcategoriaId,
    barrioId: doc.barrioId,
    organizador: doc.organizador,
    organizadorContacto: doc.organizadorContacto,
    organizadorWeb: doc.organizadorWeb,
    // Legacy documents without `modalidad` are hydrated as 'presencial'.
    modalidad: isModalidad(doc.modalidad) ? doc.modalidad : "presencial",
    ubicacion: doc.ubicacion
      ? ({
          nombreLugar: doc.ubicacion.nombreLugar,
          direccion: doc.ubicacion.direccion,
          coordenadas: doc.ubicacion.coordenadas,
        } as Ubicacion)
      : undefined,
    fechaInicio: firebase.timestampToDate(doc.fechaInicio as Timestamp)!,
    fechaFin: firebase.timestampToDate(doc.fechaFin as Timestamp)!,
    precioTipo: doc.precioTipo as Evento["precioTipo"],
    precioValor: doc.precioValor,
    precioMoneda: doc.precioMoneda as Evento["precioMoneda"],
    capacidadMaxima: doc.capacidadMaxima,
    publicoObjetivo: doc.publicoObjetivo as Evento["publicoObjetivo"],
    nivelRuido: doc.nivelRuido as Evento["nivelRuido"],
    portada: doc.portada,
    accesibilidad: doc.accesibilidad as Evento["accesibilidad"],
    estado: doc.estado as Evento["estado"],
    destacado: doc.destacado,
    estadoVerificacion: doc.estadoVerificacion as Evento["estadoVerificacion"],
    activo: doc.activo,
    usuarioId: doc.usuarioId,
    vistasTotales: doc.vistasTotales ?? 0,
    cambios: (doc.cambios ?? []) as Evento["cambios"],
    createdAt: firebase.timestampToDate(doc.createdAt as Timestamp)!,
    updatedAt: firebase.timestampToDate(doc.updatedAt as Timestamp)!,
    fechaPublicacion: firebase.timestampToDate(
      doc.fechaPublicacion as Timestamp,
    ),
  };
}

export function toEventoPersistence(
  firebase: FirebaseService,
  evt: Partial<Evento>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const fieldMap: Array<[keyof Evento, string]> = [
    ["nombre", "nombre"],
    ["slug", "slug"],
    ["descripcionCorta", "descripcionCorta"],
    ["descripcion", "descripcion"],
    ["categoriaId", "categoriaId"],
    ["subcategoriaId", "subcategoriaId"],
    ["barrioId", "barrioId"],
    ["organizador", "organizador"],
    ["organizadorContacto", "organizadorContacto"],
    ["organizadorWeb", "organizadorWeb"],
    ["precioTipo", "precioTipo"],
    ["precioValor", "precioValor"],
    ["precioMoneda", "precioMoneda"],
    ["capacidadMaxima", "capacidadMaxima"],
    ["publicoObjetivo", "publicoObjetivo"],
    ["nivelRuido", "nivelRuido"],
    ["portada", "portada"],
    ["accesibilidad", "accesibilidad"],
    ["estado", "estado"],
    ["destacado", "destacado"],
    ["estadoVerificacion", "estadoVerificacion"],
    ["activo", "activo"],
    ["usuarioId", "usuarioId"],
    ["vistasTotales", "vistasTotales"],
  ];

  for (const [domainKey, firestoreKey] of fieldMap) {
    const value = evt[domainKey];
    if (value !== undefined) {
      result[firestoreKey] = value;
    }
  }

  if (evt.modalidad !== undefined) {
    result.modalidad = evt.modalidad;
  }

  // `ubicacion` handling:
  // - `null`  → delete the field (evento switched to `online`)
  // - object  → persist the nested venue
  // - undefined → leave unchanged (partial update not touching the venue)
  if (evt.ubicacion === null) {
    result.ubicacion = firebase.getFieldValue().delete();
  } else if (evt.ubicacion) {
    result.ubicacion = {
      nombreLugar: evt.ubicacion.nombreLugar,
      direccion: evt.ubicacion.direccion,
      coordenadas: evt.ubicacion.coordenadas,
    };
  }

  if (evt.cambios) {
    result.cambios = evt.cambios;
  }

  if (evt.fechaInicio) {
    result.fechaInicio = firebase.dateToTimestamp(evt.fechaInicio);
  }
  if (evt.fechaFin) {
    result.fechaFin = firebase.dateToTimestamp(evt.fechaFin);
  }
  if (evt.fechaPublicacion) {
    result.fechaPublicacion = firebase.dateToTimestamp(evt.fechaPublicacion);
  }
  if (evt.createdAt) {
    result.createdAt = firebase.dateToTimestamp(evt.createdAt);
  }
  if (evt.updatedAt) {
    result.updatedAt = firebase.dateToTimestamp(evt.updatedAt);
  }

  return result;
}
