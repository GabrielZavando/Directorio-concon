/**
 * `@Roles(...)` decorator — records the roles metadata used by `RolesGuard`.
 *
 * This is the FINAL implementation (no stub here — the decorator logic is
 * purely metadata-setting, and `SetMetadata` IS the production behaviour
 * regardless of whether the guard is later enhanced). Task 7 will keep this
 * decorator unchanged; only `RolesGuard` is enhanced to read it.
 *
 * Usage: `@Roles('admin')`, `@Roles('owner', 'admin')`.
 */
import { SetMetadata } from "@nestjs/common";
import type { Rol } from "../domain/rol.enum";

export const ROLES_KEY = "roles";

export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
