/**
 * UpdateRolDto — body for `PUT /usuarios/:uid/rol` (admin-only).
 *
 * Validates that `rol` belongs to the closed `Rol` enum. Any other value
 * receives `400` with message `rol must be one of: admin, owner, member`.
 *
 * The `RolesGuard` with `@Roles('admin')` is the runtime enforcement of
 * "only an admin can call this endpoint"; the `@IsEnum(ROL_VALUES)` here
 * is the schema-level enforcement of the value's domain membership.
 *
 * The handler-side `UsuariosService.updateRol` enforces the cascading
 * side-effect (linkPlaceId cleanup when transitioning out of `'owner'`).
 */
import { IsEnum } from "class-validator";
import { ROL_VALUES, type Rol } from "../../../auth/domain/rol.enum";

export class UpdateRolDto {
  @IsEnum(ROL_VALUES, {
    message: "rol must be one of: admin, owner, member",
  })
  rol!: Rol;
}
