import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CoordenadasDto } from "./coordenadas.dto";

/**
 * DTO for the event location (Ubicacion value object).
 *
 * Replaces the legacy flat `ubicacionNombre` / `ubicacionDireccion` / `coordenadas`
 * tuple with a single nested object. `coordenadas` is required; `nombreLugar` is
 * optional (e.g. a venue name distinct from the street address).
 */
export class UbicacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreLugar?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  direccion!: string;

  @ValidateNested()
  @Type(() => CoordenadasDto)
  coordenadas!: CoordenadasDto;
}
