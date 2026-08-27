import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { ESTADO_VERIFICACION_VALUES } from "../../domain/estado-verificacion";

/**
 * DTO for the admin verification endpoint POST /eventos/:id/verificar.
 *
 * The wire contract uses `resultado` + `motivo` (matching `docs/api-spec.yml`
 * and the eventos-refactor spec). `motivo` is required only when rejecting —
 * enforced here with `ValidateIf` so the global `ValidationPipe` returns 400
 * before the service layer is reached.
 */
export class VerificarEventoDto {
  @IsEnum(ESTADO_VERIFICACION_VALUES)
  resultado!: "verificado" | "rechazado";

  @ValidateIf((o) => o.resultado === "rechazado")
  @IsString({
    message: "motivo is required when resultado is 'rechazado'",
  })
  @IsNotEmpty({
    message: "motivo is required when resultado is 'rechazado'",
  })
  @MaxLength(500)
  motivo?: string;
}
