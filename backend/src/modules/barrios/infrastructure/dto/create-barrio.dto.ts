import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const SLUG_REGEX = /^[a-z0-9-]+$/;

export class CreateBarrioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre!: string;

  @IsString()
  @Matches(SLUG_REGEX, { message: "slug must be lowercase, digits, hyphens" })
  @MaxLength(80)
  slug!: string;

  @IsString()
  @IsIn(["urbano", "rural"], { message: "tipo must be 'urbano' or 'rural'" })
  tipo!: "urbano" | "rural";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  territorio?: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  @Matches("^(-?\\d+(\\.\\d+)?),\\s*(-?\\d+(\\.\\d+)?)$", undefined, {
    message: "coordenadas must be 'lat,lng'",
  })
  coordenadas?: string; // string "lat,lng" — se parsea en service
}
