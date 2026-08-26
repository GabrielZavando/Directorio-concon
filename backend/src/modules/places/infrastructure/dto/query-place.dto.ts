import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from "class-validator";
import { Type, Transform } from "class-transformer";

export class QueryPlaceDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  @IsOptional()
  @IsString()
  barrioId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => value === "true" || value === true)
  activo?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(["pendiente", "verificado", "rechazado"])
  estadoVerificacion?: "pendiente" | "verificado" | "rechazado";

  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => value === "true" || value === true)
  sinDueno?: boolean;

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
