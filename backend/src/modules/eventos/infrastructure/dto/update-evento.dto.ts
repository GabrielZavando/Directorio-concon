import { PartialType } from "@nestjs/swagger";
import { CreateEventoDto } from "./create-evento.dto";

/**
 * All fields optional — partial update via PUT /eventos/:id.
 *
 * NOTE:
 * - `categoriaId` is NOT included (not in CreateEventoDto, not needed)
 * - `status` / `estado` are NOT included — set by the system or admin
 *   via approval/rejection flows (Non-Goal for publisher direct updates)
 */
export class UpdateEventoDto extends PartialType(CreateEventoDto) {}
