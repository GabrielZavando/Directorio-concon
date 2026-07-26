/**
 * BarrioOption — option rendered inside the location (`barrio`) `<select>` of
 * the SearchBarComponent. The `id` is the Firestore document id (= slug, e.g.
 * `higuerillas`), NOT a `zona_xx` code (Decision H2 of design.md).
 *
 * `territorio` and `tipo` are metadata preserved in the canonical JSON seed
 * for future use (e.g. map view, panel admin). The dumb SearchBarComponent
 * only reads `id` and `nombre` for rendering the `<select>` options.
 *
 * Single source of truth: the dumb SearchBarComponent owns this contract;
 * the LocalDirectorioOpcionesService maps the JSON seed to this interface so
 * consumers never see the inferred literal type.
 *
 * All fields are readonly and there is no `any`.
 */
export interface BarrioOption {
  /** Firestore document id (= slug canónico, e.g. 'higuerillas'). */
  readonly id: string;
  readonly nombre: string;
  readonly descripcion?: string;
  /** Sectors covered by the barrio (metadata, renamed from territorio_que_abarca). */
  readonly territorio?: string;
  /** Urban or rural classification. 'rural' only for 'zona-rural', 'urbano' for the rest. */
  readonly tipo?: 'urbano' | 'rural';
  /** Optional center coordinates of the barrio (null in the MVP seed). */
  readonly coordenadas?: { readonly lat: number; readonly lng: number } | null;
}
