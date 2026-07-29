import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  MinLength,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { CoordenadasDto } from "./coordenadas.dto";
import { PRECIO_TIPO_VALUES } from "../../domain/precio-tipo.enum";
import { PRECIO_MONEDA_VALUES } from "../../domain/precio-moneda.enum";
import { PUBLICO_OBJETIVO_VALUES } from "../../domain/publico-objetivo.enum";
import { ACCESIBILIDAD_VALUES } from "../../domain/accesibilidad.enum";
import { NIVEL_RUIDO_VALUES } from "../../domain/nivel-ruido.enum";

/**
 * DTO for creating a new event.
 *
 * NOTE:
 * - `categoriaId` is NOT included — always set to 'eventos' by the system
 * - `usuarioId` is NOT included — set from the verified Firebase Auth token
 * - `status` / `estado` are NOT included — set by the system / admin
 */
export class CreateEventoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(140)
  descripcionCorta!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  descripcion!: string;

  @IsString()
  subcategoriaId!: string;

  @IsString()
  barrioId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  organizador!: string;

  @IsOptional()
  @IsString()
  organizadorContacto?: string;

  @IsOptional()
  @IsUrl()
  organizadorWeb?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ubicacionNombre?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  ubicacionDireccion!: string;

  @ValidateNested()
  @Type(() => CoordenadasDto)
  coordenadas!: CoordenadasDto;

  @IsDateString()
  fechaInicio!: string;

  @IsDateString()
  fechaFin!: string;

  @IsEnum(PRECIO_TIPO_VALUES)
  precioTipo!: string;

  @IsNumber()
  @Min(0)
  precioValor!: number;

  @IsOptional()
  @IsEnum(PRECIO_MONEDA_VALUES)
  precioMoneda?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacidadMaxima?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(PUBLICO_OBJETIVO_VALUES, { each: true })
  publicoObjetivo!: string[];

  @IsEnum(NIVEL_RUIDO_VALUES)
  nivelRuido!: string;

  @IsOptional()
  @IsUrl()
  portada?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ACCESIBILIDAD_VALUES, { each: true })
  accesibilidad?: string[];
}
