import {
  IsString,
  Matches,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { TurnoDto } from "./turno.dto";

export class HorarioEspecialDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "fecha must be YYYY-MM-DD format",
  })
  fecha!: string;

  @IsString()
  descripcion!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnoDto)
  @ArrayMaxSize(3, { message: "Maximum 3 turnos per special date" })
  turnos!: TurnoDto[];
}
