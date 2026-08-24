import { ForbiddenException, NotFoundException } from "@nestjs/common";

/**
 * Narrows a resource loaded from a repository and throws a canonical
 * `NotFoundException` if it is missing. Centralises the not-found message
 * template used across modules: `"${label} ${id} no encontrado"`.
 */
export function assertFound<T>(
  resource: T | null | undefined,
  label: string,
  id: string,
): T {
  if (resource === null || resource === undefined) {
    throw new NotFoundException(`${label} ${id} no encontrado`);
  }
  return resource;
}

/**
 * Authorisation helper implementing the "owner or admin" rule shared by
 * owner-editable aggregates (places, eventos). Admins (`rol === "admin"`) are
 * always allowed; otherwise the actor must be the resource owner.
 */
export function assertOwnerOrAdmin(
  actor: { uid: string; rol: string },
  ownerId: string,
  action: string,
): void {
  if (actor.rol === "admin" || actor.uid === ownerId) {
    return;
  }
  throw new ForbiddenException(`No tienes permiso para ${action}`);
}
