import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/**
 * Body para `PATCH /api/v1/categorias/:id` — `nombre`, `descripcion`,
 * `color`, `icono` y `orden` son modificables; `slug` e `id` se mantienen
 * estables (slug-as-id no se renombra post-create). `orden` con duplicado
 * se rechaza con 409 por el service.
 */
export class UpdateCategoriaBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icono?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
