/**
 * UpdateRolDto — body for `PUT /usuarios/:uid/rol` (admin-only).
 *
 * Validates that `rol` belongs to the restricted closed enum
 * `[admin, member]`. The `owner` rol is acquired exclusively via
 * self-registration (`POST /auth/registro`, change `auth-usuarios-v2`);
 * admins cannot assign `owner` to existing users. Any other value
 * receives `400` with message `rol must be one of: admin, member`.
 *
 * The `RolesGuard` with `@Roles('admin')` is the runtime enforcement of
 * "only an admin can call this endpoint"; the `@IsEnum` here is the
 * schema-level enforcement of the restricted value's domain membership.
 *
 * The handler-side `UsuariosService.updateRol` does NOT perform
 * cascading `linkPlaceId` cleanup when transitioning out of `'owner'`
 * — that deferred decision belongs to the `places-refactor` change
 * (CH-03).
 */
import { IsEnum } from "class-validator";
import { ROL_VALUES, type Rol } from "../../../auth/domain/rol.enum";

export class UpdateRolDto {
  @IsEnum([...ROL_VALUES.filter((r) => r !== "owner")], {
    message: "rol must be one of: admin, member",
  })
  rol!: Rol;
}
