/**
 * Closed enumerable of social-media platforms accepted in `RedSocial.plataforma`.
 *
 * The closure:
 * - Consistent with the other closed enums in `places` (`ServicioEnum`,
 *   `MetodoPagoEnum`) and with the proyectos' `eventos` enums.
 * - Ensures predictable iconography in the frontend (lucide-angular icons
 *   are mapped to `plataforma`, see `docs/frontend-standards.md §1`).
 * - Guarantees homogeneous values for Firestore queries
 *   (e.g. "places that have Instagram").
 *
 * Migration note (`roles-rename` change): the legacy value `'twitter'` was
 * renamed to `'x-twitter'` to reflect the 2023 platform rename. Clients
 * sending `'twitter'` now receive `400` from the global `ValidationPipe`
 * (`@IsEnum` rejection); the documented replacement is `'x-twitter'`.
 *
 * Pure TypeScript, zero framework imports (DIP). The `PLATAFORMA_SOCIAL_VALUES`
 * const tuple is consumed by `class-validator`'s `@IsEnum` decorator in
 * `red-social.dto.ts` and by the `isValidRedSocial` membership check in
 * `red-social.vo.ts`.
 *
 * Canonical reference: `docs/data-model/data-model.md §places` (Value Objects,
 * PlataformaSocialEnum) and `docs/api/api-spec.yml` (`RedSocial.plataforma.enum`).
 */
export type PlataformaSocialEnum =
  | "instagram"
  | "facebook"
  | "x-twitter"
  | "linkedin"
  | "tiktok"
  | "youtube";

/**
 * Closed `as const` tuple consumed by `class-validator`'s `@IsEnum` decorator:
 *
 * ```ts
 * import { IsEnum } from "class-validator";
 * import { PLATAFORMA_SOCIAL_VALUES, PlataformaSocialEnum } from "./plataforma-social.enum";
 *
 * @IsEnum(PLATAFORMA_SOCIAL_VALUES, {
 *   message: "plataforma must be one of: instagram, facebook, x-twitter, linkedin, tiktok, youtube",
 * })
 * declare readonly plataforma: PlataformaSocialEnum;
 * ```
 *
 * Order is intentional and matches `docs/api/api-spec.yml` declaration order:
 * `instagram, facebook, x-twitter, linkedin, tiktok, youtube`.
 */
export const PLATAFORMA_SOCIAL_VALUES = [
  "instagram",
  "facebook",
  "x-twitter",
  "linkedin",
  "tiktok",
  "youtube",
] as const;
