/**
 * SubcategoriaOption — a child of a CategoryOption, preserved in the
 * canonical JSON seed for future advanced filters / panel admin UI. The dumb
 * SearchBarComponent does NOT render subcategorias in the MVP search bar
 * (Decision F2 of design.md) but they are persisted so a future change can
 * consume them without a schema bump.
 */
export interface SubcategoriaOption {
  /** Kebab-case slug, unique within the parent category. */
  readonly slug: string;
  readonly nombre: string;
  readonly descripcion?: string;
}

/**
 * CategoryOption — option rendered inside the category `<select>` of the
 * SearchBarComponent. The `id` is the Firestore document id (= slug, e.g.
 * `gastronomia`), NOT a `cat_xx` code (Decision H2 of design.md).
 *
 * Single source of truth: the dumb SearchBarComponent owns this contract;
 * the LocalDirectorioOpcionesService maps the JSON seed to this interface so
 * consumers never see the inferred literal type.
 *
 * All fields are readonly and there is no `any`.
 */
export interface CategoryOption {
  /** Firestore document id (= slug canónico, e.g. 'gastronomia'). */
  readonly id: string;
  readonly nombre: string;
  readonly descripcion?: string;
  /** Lucide icon name in kebab-case (e.g. 'utensils', 'store', 'tent'). */
  readonly icono: string;
  /** Visual ordering, inferred from the seed array position (1..9). */
  readonly orden: number;
  /** Whether the category is active (true for all MVP seed entries). */
  readonly activa: boolean;
  /** Child subcategories preserved for future use (not rendered in MVP). */
  readonly subcategorias?: ReadonlyArray<SubcategoriaOption>;
}
