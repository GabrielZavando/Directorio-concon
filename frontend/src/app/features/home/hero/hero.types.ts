/**
 * Type contracts for the HomeHeroComponent (dumb) and HomePageComponent (smart).
 *
 * Single source of truth: the dumb hero owns these types and the smart
 * container imports them, so the future swap of hardcoded dummy categorias /
 * barrios for HTTP / Firestore data cannot drift from the hero contract.
 *
 * All fields are readonly and there is no `any`.
 */

/**
 * Payload emitted by the dumb hero when the user submits the search form.
 * `q` is trimmed by the hero before emitting; `categoriaId` and `barrioId`
 * are empty strings when the corresponding placeholder option is selected.
 */
export interface SearchCriteria {
  readonly q: string;
  readonly categoriaId: string;
  readonly barrioId: string;
}

/**
 * Option rendered inside the category `<select>` of the hero.
 * The `id` maps to the future Firestore categoria document id (or its slug).
 */
export interface CategoryOption {
  readonly id: string;
  readonly nombre: string;
}

/**
 * Option rendered inside the location (`barrio`) `<select>` of the hero.
 * The `id` maps to the future Firestore barrio document id (or its slug).
 */
export interface BarrioOption {
  readonly id: string;
  readonly nombre: string;
}
