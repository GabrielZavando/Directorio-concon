import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUrl,
  IsBoolean,
  MaxLength,
  MinLength,
  IsEnum,
  ArrayMaxSize,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RedSocialDto } from "./red-social.dto";
import { CoordenadasDto } from "./coordenadas.dto";
import { ImagenGaleriaDto } from "./imagen-galeria.dto";
import { CertificacionDto } from "./certificacion.dto";
import { MiembroEquipoDto } from "./miembro-equipo.dto";

export class CreateEmpresaDto {
  @ApiProperty({ description: "Business name", example: "Restaurante El Marino" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.&0-9]+$/, {
    message: "Only letters, numbers, spaces and allowed characters (-, ., &)",
  })
  nombre: string;

  @ApiProperty({ description: "Detailed business description", example: "Restaurante familiar especializado en mariscos." })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  descripcion: string;

  @ApiProperty({ description: "Category ID", example: "cat-restaurantes-123" })
  @IsString()
  categoriaId: string;

  @ApiProperty({ description: "Neighborhood ID", example: "barrio-centro-456" })
  @IsString()
  barrioId: string;

  @ApiProperty({ description: "Full physical address", example: "Av. Borgoño 12345, Concón" })
  @IsString()
  @MaxLength(200)
  direccion: string;

  @ApiPropertyOptional({ description: "Phone (Chilean format)", example: "+56932123456" })
  @IsOptional()
  @IsString()
  @Matches(/^(\+56)?[2-9]\d{7,8}$/, { message: "Invalid Chilean phone format" })
  telefono?: string;

  @ApiPropertyOptional({ description: "Contact email", example: "contacto@elmarino.cl" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Website URL", example: "https://www.elmarino.cl" })
  @IsOptional()
  @IsUrl()
  sitioWeb?: string;

  @ApiPropertyOptional({ description: "Social networks (max 3)", type: [RedSocialDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: "Maximum 3 social networks allowed" })
  @ValidateNested({ each: true })
  @Type(() => RedSocialDto)
  redesSociales?: RedSocialDto[];

  @ApiProperty({ description: "Plan ID", example: "gratuito" })
  @IsString()
  @IsEnum(["gratuito", "premium"])
  planId: string;

  @ApiPropertyOptional({ description: "Owner user ID", example: "auth-uid-123" })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiPropertyOptional({ description: "Business hours", example: "Lun-Vie: 9:00-18:00" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  horarios?: string;

  @ApiPropertyOptional({ description: "Main services", example: ["Almuerzos", "Cenas"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicios?: string[];

  @ApiPropertyOptional({ description: "Geographic coordinates", type: CoordenadasDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordenadasDto)
  coordenadas?: CoordenadasDto;

  @ApiPropertyOptional({ description: "Logo URL", example: "https://storage.googleapis.com/directorio-concon/logos/logo.jpg" })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  // Premium fields (only when planId === 'premium')

  @ApiPropertyOptional({ description: "Image gallery (premium only)", type: [ImagenGaleriaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagenGaleriaDto)
  galeria?: ImagenGaleriaDto[];

  @ApiPropertyOptional({ description: "Promotional video URL (premium)", example: "https://youtube.com/watch?v=abc123" })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ description: "Slogan or tagline (premium)", example: "Los mejores mariscos de la costa" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eslogan?: string;

  @ApiPropertyOptional({ description: "Mission statement (premium)", example: "Ofrecer la mejor experiencia gastronómica" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mision?: string;

  @ApiPropertyOptional({ description: "Vision statement (premium)", example: "Ser el restaurante más reconocido de la región" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  vision?: string;

  @ApiPropertyOptional({ description: "Corporate values (premium)", example: ["Calidad", "Frescura"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  valores?: string[];

  @ApiPropertyOptional({ description: "Featured specialties (premium)", example: ["Paella marinera", "Ceviche"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  especialidades?: string[];

  @ApiPropertyOptional({ description: "Certifications (premium)", type: [CertificacionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificacionDto)
  certificaciones?: CertificacionDto[];

  @ApiPropertyOptional({ description: "Team members (premium)", type: [MiembroEquipoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MiembroEquipoDto)
  equipo?: MiembroEquipoDto[];

  @ApiPropertyOptional({ description: "Chat enabled for networking (premium)", example: true, default: false })
  @IsOptional()
  @IsBoolean()
  chatHabilitado?: boolean;

  @ApiPropertyOptional({ description: "SEO keywords (premium)", example: ["restaurante", "mariscos", "concón"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  palabrasClave?: string[];

  @ApiPropertyOptional({ description: "Custom meta description for SEO (premium)", example: "Restaurante El Marino en Concón" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescripcion?: string;
}
