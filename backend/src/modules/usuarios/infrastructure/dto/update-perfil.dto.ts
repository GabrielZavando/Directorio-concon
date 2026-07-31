/**
 * UpdatePerfilDto — body for `PUT /usuarios/me`.
 *
 * Self-service update of the authenticated user's own profile. The body
 * accepts ONLY `nombre` and `telefono`. `rol` and `placeId` are NOT
 * accepted — they are admin-only mutations (`PUT /usuarios/:uid/rol` /
 * admin provisioning). The global `ValidationPipe` with
 * `forbidNonWhitelisted: true` rejects any other field with `400`.
 *
 * Pure DTO: no business rules here (no ownership checks, no DB lookups).
 * Those live in the `UsuariosService`.
 */
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdatePerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  /**
   * Chilean-format phone (free string; the project does not enforce a
   * regex here — `data-model.md §usuarios` documents `telefono` as a free
   * Chilean string).
   */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;
}
