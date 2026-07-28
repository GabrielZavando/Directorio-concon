import { IsString, Matches } from "class-validator";

export class TurnoDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "apertura must be HH:mm format (00:00–23:59)",
  })
  apertura!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "cierre must be HH:mm format (00:00–23:59)",
  })
  cierre!: string;
}
