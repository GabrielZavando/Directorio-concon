import {
  IsString,
  IsUrl,
  IsOptional,
  MaxLength,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MiembroEquipoDto {
  @ApiProperty({ description: "Team member name", example: "Juan Pérez" })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]+$/, {
    message: "Only letters, spaces and hyphens",
  })
  nombre: string;

  @ApiProperty({
    description: "Role in the company",
    example: "Gerente General",
  })
  @IsString()
  @MaxLength(100)
  cargo: string;

  @ApiPropertyOptional({
    description: "Photo URL",
    example: "https://storage.googleapis.com/directorio-concon/equipo/juan.jpg",
  })
  @IsOptional()
  @IsUrl()
  foto?: string;

  @ApiPropertyOptional({
    description: "Member description",
    example: "Más de 10 años de experiencia",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;
}
