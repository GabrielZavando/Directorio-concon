/**
 * CreateUsuarioDto — body for `POST /usuarios` (admin-only provisioning).
 *
 * The Firebase Auth user is created CLIENT-SIDE; this DTO writes the
 * matching `usuarios` document. Self-registration is deferred (see change
 * `usuarios-self-signup`). For MVP, only an authenticated `admin` can
 * create a new `usuarios` row.
 *
 * Constraints:
 * - `id` (Firebase Auth UID) is REQUIRED — the caller must have created
 *   the Auth user first.
 * - `email` is validated as RFC email and is UNIQUE across the collection
 *   (enforced at the service layer; see `UsuariosService.create`).
 * - `nombre` 2..100 chars.
 * - `rol` defaults to `'member'` (the registration default per
 *   `docs/data-model.md §usuarios`).
 * - `placeId` is OPTIONAL but MUST be omitted when `rol !== 'owner'`.
 *   Cross-field enforcement lives in `UsuariosService.create` (Task 4).
 *
 * Pure DTO: no DB lookups, no Firebase calls.
 */
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ROL_VALUES, type Rol } from "../../../auth/domain/rol.enum";

export class CreateUsuarioDto {
  /** Firebase Auth UID (PK). Required. */
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  id!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @IsOptional()
  @IsEnum(ROL_VALUES, {
    message: "rol must be one of: admin, owner, member",
  })
  rol?: Rol;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  placeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;
}
