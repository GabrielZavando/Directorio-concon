import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  MinLength,
} from "class-validator";

/**
 * Iconos Lucide soportados por el design system "Dunas y Océano".
 * Coincide con los valores `categorias.icono` declarados en `docs/data-model.md`.
 * Cualquier `icono` fuera de esta lista es rechazado por ValidationPipe.
 */
export const LUCIDE_ICONS = [
  "utensils",
  "store",
  "tent",
  "briefcase",
  "car",
  "heart-pulse",
  "graduation-cap",
  "building-2",
  "party-popper",
] as const;

export type LucideIcon = (typeof LUCIDE_ICONS)[number];

const SLUG_REGEX = /^[a-z0-9-]+$/;

export class CreateCategoriaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre!: string;

  @IsString()
  @Matches(SLUG_REGEX, { message: "slug must be lowercase, digits, hyphens" })
  @MaxLength(80)
  slug!: string;
  @IsString()
  @IsIn(LUCIDE_ICONS, {
    message: `icono must be one of: ${LUCIDE_ICONS.join(", ")}`,
  })
  icono!: string;

  @IsInt()
  @Min(1)
  @Max(99)
  orden!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @Matches("^#[0-9a-fA-F]{6}$", undefined, {
    message: "color must be hex like #RRGGBB",
  })
  color?: string;

  // Activo, id, subcategorias se rechazan explícitamente vía forbidNonWhitelisted.
}
