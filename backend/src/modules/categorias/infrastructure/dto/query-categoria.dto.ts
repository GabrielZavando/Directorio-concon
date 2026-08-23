import { IsOptional, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

/**
 * Query params para `GET /api/v1/categorias`. `activa=true` filtra a
 * `activo: true` y filtra el array `subcategorias` a solo activas.
 *
 * Sin parámetro → modo admin (devuelve todo con flag `activo`).
 */
export class QueryCategoriaDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === "true")
  activa?: boolean;
}
