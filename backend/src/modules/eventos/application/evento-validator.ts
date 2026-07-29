/**
 * Cross-field validation rules for eventos.
 *
 * SRP: separated from EventosService to keep application logic testable
 * and focused on orchestration rather than validation details.
 *
 * All validators return an error message string or null if valid.
 */
import { Injectable } from "@nestjs/common";
import type { FirebaseService } from "../../../common/services/firebase.service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The 10 seeded subcategoria slugs for categoria 'eventos'.
 * Defined here and in docs/data-model.md §eventos.
 */
export const EVENTO_SUBCATEGORIAS = [
  "festivales-culturales",
  "ferias-gastronomicas",
  "ferias-libres",
  "deportes-y-competencias",
  "conciertos-y-shows",
  "talleres-y-clases-abiertas",
  "eventos-familiares",
  "temporada-de-verano",
  "fiestas-patrias",
  "mercados-sustentables",
] as const;

// ---------------------------------------------------------------------------
// Validator service
// ---------------------------------------------------------------------------

@Injectable()
export class EventoValidator {
  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Validates all cross-field rules for a create/update operation.
   * Returns an array of error messages (empty array = valid).
   */
  async validateCreate(data: {
    nombre?: string;
    descripcion?: string;
    subcategoriaId?: string;
    barrioId?: string;
    fechaInicio?: string | Date;
    fechaFin?: string | Date;
    precioTipo?: string;
    precioValor?: number;
    publicoObjetivo?: string[];
    placeId?: string;
  }): Promise<string[]> {
    const errors: string[] = [];

    // Validate fechaFin > fechaInicio
    errors.push(...this.validateFechas(data.fechaInicio, data.fechaFin));

    // Validate precio constraints
    errors.push(...this.validatePrecio(data.precioTipo, data.precioValor));

    // Validate publicoObjetivo has at least 1 element
    errors.push(...this.validatePublicoObjetivo(data.publicoObjetivo));

    // Validate subcategoriaId is one of the seeded slugs
    errors.push(...this.validateSubcategoria(data.subcategoriaId));

    // Validate barrioId exists in Firestore (async)
    if (data.barrioId) {
      const barrioExists = await this.firebaseService.documentExists(
        "barrios",
        data.barrioId,
      );
      if (!barrioExists) {
        errors.push(`Barrio '${data.barrioId}' no existe`);
      }
    }

    // Validate placeId (if present) references an approved place
    if (data.placeId) {
      errors.push(...(await this.validatePlaceId(data.placeId)));
    }

    return errors;
  }

  // ---------------------------------------------------------------------------
  // Private validators
  // ---------------------------------------------------------------------------

  private validateFechas(
    fechaInicio?: string | Date,
    fechaFin?: string | Date,
  ): string[] {
    if (!fechaInicio || !fechaFin) return [];
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return [];
    if (fin <= inicio) {
      return ["fechaFin debe ser mayor que fechaInicio"];
    }
    return [];
  }

  private validatePrecio(precioTipo?: string, precioValor?: number): string[] {
    if (!precioTipo) return [];
    if (precioTipo === "gratis" && precioValor !== 0) {
      return ["precioValor debe ser 0 cuando precioTipo es 'gratis'"];
    }
    if (
      precioTipo !== "gratis" &&
      precioValor !== undefined &&
      precioValor <= 0
    ) {
      return ["precioValor debe ser > 0 cuando precioTipo no es 'gratis'"];
    }
    return [];
  }

  private validatePublicoObjetivo(publicoObjetivo?: string[]): string[] {
    if (!publicoObjetivo || publicoObjetivo.length === 0) {
      return ["publicoObjetivo debe contener al menos un elemento"];
    }
    return [];
  }

  private validateSubcategoria(subcategoriaId?: string): string[] {
    if (!subcategoriaId) return ["subcategoriaId es requerido"];
    if (
      !EVENTO_SUBCATEGORIAS.includes(
        subcategoriaId as (typeof EVENTO_SUBCATEGORIAS)[number],
      )
    ) {
      return [
        `subcategoriaId '${subcategoriaId}' no es válida. Valores permitidos: ${EVENTO_SUBCATEGORIAS.join(", ")}`,
      ];
    }
    return [];
  }

  private async validatePlaceId(placeId: string): Promise<string[]> {
    const doc = await this.firebaseService.getDocument("places", placeId);
    if (!doc.exists) {
      return [`Place '${placeId}' no existe`];
    }
    const placeData = doc.data();
    if (placeData?.status !== "aprobado") {
      return [
        `Place '${placeId}' debe tener status 'aprobado' (actual: ${placeData?.status})`,
      ];
    }
    return [];
  }
}
