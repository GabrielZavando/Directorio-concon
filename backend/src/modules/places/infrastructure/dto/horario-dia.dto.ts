import {
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { TurnoDto } from "./turno.dto";

export type DiaSemana =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";

const DIAS_SEMANA: readonly string[] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

export class HorarioDiaDto {
  @IsEnum(DIAS_SEMANA as unknown as string[], {
    message:
      "dia must be one of: lunes, martes, miercoles, jueves, viernes, sabado, domingo",
  })
  dia!: DiaSemana;

  @IsBoolean()
  abierto!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnoDto)
  @ArrayMaxSize(3, { message: "Maximum 3 turnos per day" })
  turnos!: TurnoDto[];
}
