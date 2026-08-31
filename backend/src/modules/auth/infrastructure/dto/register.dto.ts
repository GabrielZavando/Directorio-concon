/**
 * RegisterDto — DTO para el registro público con selección de rol.
 * Validación estricta: solo `member` o `owner` son aceptados.
 * El rol `admin` es rechazado con 400 (el primer admin se provisiona
 * vía el script `seed-admin.ts`, nunca por API pública).
 *
 * Aplicado en el endpoint `POST /api/v1/auth/registro` decorado con
 * `@Public()` (change `auth-usuarios-v2`, CH-02).
 *
 * Referencias:
 *  - class-validator rules (minLength, MaxLength, IsIn)
 *  - type guard `isRol` en `auth.service.ts` para validación server-side
 *  - OpenSpec `RegisterRol` enum en `docs/api/api-spec.yml`
 */
import {
  IsEmail,
  IsIn,
  MinLength,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsIn(["member", "owner"])
  rol: "member" | "owner";
}
