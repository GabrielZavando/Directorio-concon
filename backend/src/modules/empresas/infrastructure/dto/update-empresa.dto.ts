import { PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateEmpresaDto } from "./create-empresa.dto";

export class UpdateEmpresaDto extends PartialType(CreateEmpresaDto) {
  @ApiPropertyOptional({
    description: "Nombre de la empresa (al actualizarlo se regenera el slug)",
    example: "Restaurante El Marino Renovado",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;
}
