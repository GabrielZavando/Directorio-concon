import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsDefined,
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

  /**
   * Street address is now OPTIONAL. Only `coordenadas` is mandatory, so an evento
   * can declare its venue by coordinates alone (direccion may be filled later or
   * resolved by coincidence with a `place`).
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => CoordenadasDto)
  coordenadas!: CoordenadasDto;
}
