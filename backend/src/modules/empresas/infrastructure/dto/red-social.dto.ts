import { IsString, IsUrl, IsOptional, MinLength, MaxLength, IsUUID, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RedSocialDto {
  @ApiProperty({ description: "Unique ID for the social network", example: "uuid-123-456" })
  @IsUUID("4")
  id: string;

  @ApiProperty({ description: "Social network name", example: "Facebook" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nombre: string;

  @ApiProperty({ description: "Icon name (Lucide format)", example: "facebook" })
  @IsString()
  @Matches(/^[a-z-]+$/, { message: "Icon must be kebab-case" })
  icono: string;

  @ApiProperty({ description: "Full URL to the social profile", example: "https://facebook.com/miempresa" })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ description: "Hex color for button", example: "#1877F2" })
  @IsOptional()
  @Matches(/^#[0-9A-F]{6}$/i, { message: "Must be a valid hex color" })
  color?: string;
}
