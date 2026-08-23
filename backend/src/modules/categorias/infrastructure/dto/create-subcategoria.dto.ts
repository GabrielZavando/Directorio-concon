import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";

const SLUG_REGEX = /^[a-z0-9-]+$/;

/**
 * Body para `POST /api/v1/categorias/:id/subcategorias`.
 * `activo` siempre es `true` al crear (los toggles van por endpoint dedicado).
 */
export class CreateSubcategoriaDto {
  @IsString()
  @Matches(SLUG_REGEX, { message: "slug must be lowercase, digits, hyphens" })
  @MinLength(2)
  @MaxLength(60)
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre!: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === undefined ? true : value))
  activo?: boolean;
}
