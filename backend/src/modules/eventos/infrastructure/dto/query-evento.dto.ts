import { IsOptional, IsString, IsInt, IsEnum, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { PRECIO_TIPO_VALUES } from "../../domain/precio-tipo.enum";
import { EVENTO_ESTADO_VALUES } from "../../domain/evento-estado.enum";

/**
 * Query params for GET /eventos.
 *
 * - `categoriaId` defaults to 'eventos' at the service layer (not in DTO itself)
 * - `estado` defaults to 'programado' at the service layer
 * - Page/limit defaults: page=1, limit=20 at the service layer
 */
export class QueryEventoDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  @IsOptional()
  @IsString()
  subcategoriaId?: string;

  @IsOptional()
  @IsString()
  barrioId?: string;

  @IsOptional()
  @IsString()
  fechaDesde?: string;

  @IsOptional()
  @IsString()
  fechaHasta?: string;

  @IsOptional()
  @IsEnum(PRECIO_TIPO_VALUES)
  precioTipo?: string;

  @IsOptional()
  @IsEnum(EVENTO_ESTADO_VALUES)
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
