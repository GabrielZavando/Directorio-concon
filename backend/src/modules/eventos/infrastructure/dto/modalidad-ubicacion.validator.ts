/**
 * Cross-field validation: `ubicacion` is required when `modalidad !== 'online'`
 * and forbidden when `modalidad === 'online'`.
 *
 * Applied as a class-level constraint on Create/Update DTOs so a single rule
 * governs both directions (DRY) instead of duplicating `ValidateIf` logic.
 */
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

export interface ModalidadAware {
  modalidad?: string;
  ubicacion?: unknown;
}

@ValidatorConstraint({ name: "modalidadUbicacion", async: false })
export class ModalidadUbicacionConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as ModalidadAware;

    // Partial updates may not touch `modalidad` at all — only enforce the
    // pairing when the caller actually sends a `modalidad`.
    if (obj.modalidad === undefined) {
      return true;
    }

    const hasUbicacion = obj.ubicacion !== undefined && obj.ubicacion !== null;

    if (obj.modalidad === "online") {
      // Online events must NOT carry an ubicacion.
      return !hasUbicacion;
    }

    // presencial / hibrido REQUIRE an ubicacion.
    return hasUbicacion;
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as ModalidadAware;
    if (obj.modalidad === "online") {
      return "online events must not include ubicacion";
    }
    return "ubicacion is required when modalidad is not 'online'";
  }
}
