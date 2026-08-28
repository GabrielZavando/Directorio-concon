import { PartialType } from "@nestjs/swagger";
import { CreateEventoDto } from "./create-evento.dto";

/**
 * All fields optional — partial update via PUT /eventos/:id.
 *
 * NOTE:
 * - `categoriaId` is NOT included (not in CreateEventoDto, not needed)
 * - `status` / `estado` are NOT included — set by the system or admin
 *   via approval/rejection flows (Non-Goal for publisher direct updates)
 * - The `ModalidadUbicacionConstraint` is inherited from `CreateEventoDto`
 *   (via the `@Validate` decorator on the `modalidad` property, copied by
 *   PartialType), so the conditional ubicacion rule applies on update too.
 */
export class UpdateEventoDto extends PartialType(CreateEventoDto) {}
