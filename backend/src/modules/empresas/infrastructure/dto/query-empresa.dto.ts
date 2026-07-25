import { IsOptional, IsString, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import type { EmpresaStatus } from "../../domain/empresa-status";

/**
 * DTO for GET /empresas query parameters.
 * Replaces 6 individual @Query() params (ISP: ≤3 params guideline).
 */
export class QueryEmpresaDto {
  @ApiPropertyOptional({ description: "Filter by category ID" })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiPropertyOptional({ description: "Filter by neighborhood ID" })
  @IsOptional()
  @IsString()
  barrioId?: string;

  @ApiPropertyOptional({ description: "Text search in empresa name" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: "Filter by status",
    enum: ["pendiente", "aprobado", "rechazado"],
  })
  @IsOptional()
  @IsEnum(["pendiente", "aprobado", "rechazado"])
  status?: EmpresaStatus;

  @ApiPropertyOptional({ description: "Page number (default: 1)", default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: "Items per page (default: 20)",
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
