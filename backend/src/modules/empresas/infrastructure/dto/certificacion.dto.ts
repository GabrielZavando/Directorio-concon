import { IsString, IsUrl, IsOptional, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CertificacionDto {
  @ApiProperty({ description: "Certification name", example: "ISO 9001:2015" })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ description: "Issuing entity", example: "Bureau Veritas" })
  @IsString()
  @MaxLength(100)
  emisor: string;

  @ApiProperty({
    description: "Obtention date (ISO format)",
    example: "2023-06-15T00:00:00.000Z",
  })
  @IsString()
  fechaObtencion: string;

  @ApiPropertyOptional({
    description: "Certificate URL",
    example: "https://certificados.com/123456.pdf",
  })
  @IsOptional()
  @IsUrl()
  url?: string;
}
