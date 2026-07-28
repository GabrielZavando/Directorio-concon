import { PartialType } from "@nestjs/swagger";
import { CreatePlaceDto } from "./create-place.dto";

/**
 * All fields optional — partial update via PUT /places/:id.
 */
export class UpdatePlaceDto extends PartialType(CreatePlaceDto) {}
