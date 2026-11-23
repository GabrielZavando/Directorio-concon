import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

/**
 * Query DTO for the admin queue listing `GET /solicitudes`.
 * CH-05 (solicitudes-refactor).
 */
export class QuerySolicitudesDto {
  @IsOptional()
  @IsIn(["pendiente", "aprobado", "rechazado"])
  status?: "pendiente" | "aprobado" | "rechazado";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
