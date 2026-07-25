import {
  IsString,
  IsUrl,
  IsOptional,
  IsNumber,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ImagenGaleriaDto {
  @ApiProperty({ description: "Unique image ID", example: "img-123-456" })
  @IsUUID("4")
  id: string;

  @ApiProperty({
    description: "Image URL",
    example:
      "https://storage.googleapis.com/directorio-concon/empresas/logo.jpg",
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: "Image description",
    example: "Interior del restaurante",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @ApiProperty({ description: "Display order in gallery", example: 1 })
  @IsNumber()
  orden: number;
}
