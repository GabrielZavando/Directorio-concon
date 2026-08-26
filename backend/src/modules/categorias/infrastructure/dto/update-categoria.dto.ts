import { PartialType } from "@nestjs/mapped-types";
import { CreateCategoriaDto } from "./create-categoria.dto";

/**
 * UpdateCategoriaDto — todos los campos opcionales. `slug` se mantiene
 * NO modificable (debe ser estable para referencias desde places/eventos).
 * Si admin necesita renombrar el slug, debe crear una categoría nueva con
 * el slug nuevo y migrar manualmente las referencias en places/eventos.
 */
export class UpdateCategoriaDto extends PartialType(CreateCategoriaDto) {
  // No overrides — slug heredado pero permanece de solo lectura en práctica
  // porque el controller no lo expone en updateById (ver CategoriasService.updateById).
}
