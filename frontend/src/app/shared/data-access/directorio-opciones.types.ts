/**
 * DirectorioOpciones — boundary type combining the categorias and barrios
 * arrays emitted by the DirectorioOpcionesPort. This is the ONLY type any
 * consumer sees; the inferred literal type from the JSON seed stays private
 * inside the LocalDirectorioOpcionesService so downstream consumers never
 * observe type widening (Decision 4 of design.md).
 */
import { CategoryOption } from '../ui/search-bar/interfaces/category-option.interface';
import { BarrioOption } from '../ui/search-bar/interfaces/barrio-option.interface';

export interface DirectorioOpciones {
  readonly categorias: readonly CategoryOption[];
  readonly barrios: readonly BarrioOption[];
}
