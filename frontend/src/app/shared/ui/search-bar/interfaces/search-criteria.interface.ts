/**
 * SearchCriteria — payload emitted by the SearchBarComponent when the user
 * submits the search form.
 *
 * `q` is trimmed by the dumb component before emitting. `categoriaId` and
 * `barrioId` are empty strings when the corresponding placeholder option is
 * selected (no filter chosen). Downstream consumers (smart pages) are
 * expected to omit empty fields from the resulting query params.
 *
 * Single source of truth: the dumb SearchBarComponent owns this contract and
 * the smart SearchBarContainerComponent imports it, so the future swap of
 * data sources cannot drift from the search-bar contract.
 *
 * All fields are readonly and there is no `any`.
 */
export interface SearchCriteria {
  /** Free-text query, trimmed by the dumb component before emitting. */
  readonly q: string;
  /** Selected category id (Firestore slug) or empty string when placeholder. */
  readonly categoriaId: string;
  /** Selected barrio id (Firestore slug) or empty string when placeholder. */
  readonly barrioId: string;
}
