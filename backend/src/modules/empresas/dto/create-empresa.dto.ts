import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUrl,
  IsNumber,
  IsBoolean,
  MaxLength,
  MinLength,
  IsEnum,
  ArrayMaxSize,
  IsUUID,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RedSocialDto {
  @ApiProperty({
    description: "ID único de la red social",
    example: "uuid-123-456",
  })
  @IsUUID("4")
  id: string;

  @ApiProperty({
    description: "Nombre de la red social",
    example: "Facebook",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nombre: string;

  @ApiProperty({
    description: "Icono de la red social (nombre de icono Lucide)",
    example: "facebook",
  })
  @IsString()
  @Matches(/^[a-z-]+$/, {
    message: "El icono debe estar en formato kebab-case",
  })
  icono: string;

  @ApiProperty({
    description: "URL completa al perfil de la red social",
    example: "https://facebook.com/miempresa",
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: "Color hexadecimal para el botón",
    example: "#1877F2",
  })
  @IsOptional()
  @Matches(/^#[0-9A-F]{6}$/i, {
    message: "Debe ser un color hexadecimal válido",
  })
  color?: string;
}

export class CoordenadasDto {
  @ApiProperty({
    description: "Latitud de la ubicación",
    example: -32.9175,
  })
  @IsNumber()
  lat: number;

  @ApiProperty({
    description: "Longitud de la ubicación",
    example: -71.5103,
  })
  @IsNumber()
  lng: number;
}

export class ImagenGaleriaDto {
  @ApiProperty({
    description: "ID único de la imagen",
    example: "img-123-456",
  })
  @IsUUID("4")
  id: string;

  @ApiProperty({
    description: "URL de la imagen",
    example:
      "https://storage.googleapis.com/directorio-concon/empresas/logo.jpg",
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: "Descripción de la imagen",
    example: "Interior del restaurante",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @ApiProperty({
    description: "Orden de la imagen en la galería",
    example: 1,
  })
  @IsNumber()
  orden: number;
}

export class CertificacionDto {
  @ApiProperty({
    description: "Nombre de la certificación",
    example: "ISO 9001:2015",
  })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({
    description: "Entidad emisora",
    example: "Bureau Veritas",
  })
  @IsString()
  @MaxLength(100)
  emisor: string;

  @ApiProperty({
    description: "Fecha de obtención en formato ISO",
    example: "2023-06-15T00:00:00.000Z",
  })
  @IsString()
  fechaObtencion: string;

  @ApiPropertyOptional({
    description: "URL del certificado",
    example: "https://certificados.com/123456.pdf",
  })
  @IsOptional()
  @IsUrl()
  url?: string;
}

export class MiembroEquipoDto {
  @ApiProperty({
    description: "Nombre del miembro del equipo",
    example: "Juan Pérez",
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]+$/, {
    message: "Solo letras, espacios y guiones",
  })
  nombre: string;

  @ApiProperty({
    description: "Cargo en la empresa",
    example: "Gerente General",
  })
  @IsString()
  @MaxLength(100)
  cargo: string;

  @ApiPropertyOptional({
    description: "URL de la foto del miembro",
    example: "https://storage.googleapis.com/directorio-concon/equipo/juan.jpg",
  })
  @IsOptional()
  @IsUrl()
  foto?: string;

  @ApiPropertyOptional({
    description: "Descripción del miembro",
    example: "Más de 10 años de experiencia en el sector",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;
}

export class CreateEmpresaDto {
  @ApiProperty({
    description: "Nombre de la empresa",
    example: "Restaurante El Marino",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.&0-9]+$/, {
    message: "Solo letras, números, espacios y caracteres permitidos (-, ., &)",
  })
  nombre: string;

  @ApiProperty({
    description: "Descripción detallada de la empresa",
    example:
      "Restaurante familiar especializado en mariscos y pescados frescos de la zona.",
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  descripcion: string;

  @ApiProperty({
    description: "ID de la categoría",
    example: "cat-restaurantes-123",
  })
  @IsString()
  categoriaId: string;

  @ApiProperty({
    description: "ID del barrio",
    example: "barrio-centro-456",
  })
  @IsString()
  barrioId: string;

  @ApiProperty({
    description: "Dirección física completa",
    example: "Av. Borgoño 12345, Concón, Valparaíso",
  })
  @IsString()
  @MaxLength(200)
  direccion: string;

  @ApiPropertyOptional({
    description: "Teléfono de contacto (formato chileno)",
    example: "+56932123456",
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+56)?[2-9]\d{7,8}$/, {
    message: "Formato de teléfono chileno inválido",
  })
  telefono?: string;

  @ApiPropertyOptional({
    description: "Email de contacto",
    example: "contacto@elmarino.cl",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: "URL del sitio web",
    example: "https://www.elmarino.cl",
  })
  @IsOptional()
  @IsUrl()
  sitioWeb?: string;

  @ApiPropertyOptional({
    description: "Redes sociales de la empresa (máximo 3)",
    type: [RedSocialDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: "Máximo 3 redes sociales permitidas" })
  @ValidateNested({ each: true })
  @Type(() => RedSocialDto)
  redesSociales?: RedSocialDto[];

  @ApiProperty({
    description: "ID del plan de la empresa",
    example: "gratuito",
  })
  @IsString()
  @IsEnum(["gratuito", "premium"])
  planId: string;

  @ApiPropertyOptional({
    description: "ID del usuario propietario de la empresa",
    example: "auth-uid-123",
  })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiPropertyOptional({
    description: "Horarios de atención",
    example: "Lunes a Viernes: 9:00 - 18:00, Sábados: 10:00 - 14:00",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  horarios?: string;

  @ApiPropertyOptional({
    description: "Lista de servicios principales",
    example: ["Almuerzos", "Cenas", "Eventos especiales"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicios?: string[];

  @ApiPropertyOptional({
    description: "Coordenadas geográficas",
    type: CoordenadasDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordenadasDto)
  coordenadas?: CoordenadasDto;

  @ApiPropertyOptional({
    description: "URL del logo",
    example: "https://storage.googleapis.com/directorio-concon/logos/logo.jpg",
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  // Campos premium (solo si planId === 'premium')

  @ApiPropertyOptional({
    description: "Galería de imágenes adicionales (solo premium)",
    type: [ImagenGaleriaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagenGaleriaDto)
  galeria?: ImagenGaleriaDto[];

  @ApiPropertyOptional({
    description: "URL de video promocional (solo premium)",
    example: "https://www.youtube.com/watch?v=abc123",
  })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: "Eslogan o tagline (solo premium)",
    example: "Los mejores mariscos de la costa",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eslogan?: string;

  @ApiPropertyOptional({
    description: "Misión de la empresa (solo premium)",
    example:
      "Ofrecer la mejor experiencia gastronómica con productos frescos del mar",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mision?: string;

  @ApiPropertyOptional({
    description: "Visión de la empresa (solo premium)",
    example: "Ser el restaurante de mariscos más reconocido de la región",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  vision?: string;

  @ApiPropertyOptional({
    description: "Valores corporativos (solo premium)",
    example: ["Calidad", "Frescura", "Servicio al cliente"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  valores?: string[];

  @ApiPropertyOptional({
    description: "Especialidades o productos destacados (solo premium)",
    example: ["Paella marinera", "Ceviche", "Empanadas de mariscos"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  especialidades?: string[];

  @ApiPropertyOptional({
    description: "Certificaciones de la empresa (solo premium)",
    type: [CertificacionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificacionDto)
  certificaciones?: CertificacionDto[];

  @ApiPropertyOptional({
    description: "Equipo de trabajo (solo premium)",
    type: [MiembroEquipoDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MiembroEquipoDto)
  equipo?: MiembroEquipoDto[];

  @ApiPropertyOptional({
    description: "Chat habilitado para networking (solo premium)",
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  chatHabilitado?: boolean;

  @ApiPropertyOptional({
    description: "Palabras clave para SEO (solo premium)",
    example: ["restaurante", "mariscos", "concón", "paella"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  palabrasClave?: string[];

  @ApiPropertyOptional({
    description: "Meta descripción personalizada para SEO (solo premium)",
    example:
      "Restaurante El Marino en Concón - Los mejores mariscos y pescados frescos",
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescripcion?: string;
}
