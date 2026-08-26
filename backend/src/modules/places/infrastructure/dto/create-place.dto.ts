import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsUrl,
  IsArray,
  IsBoolean,
  ValidateNested,
  ArrayMaxSize,
  MinLength,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { CoordenadasDto } from "./coordenadas.dto";
import { HorarioDiaDto } from "./horario-dia.dto";
import { HorarioEspecialDto } from "./horario-especial.dto";
import { ImagenesDto } from "./imagenes.dto";
import { RedSocialDto } from "./red-social.dto";
import { SERVICIO_VALUES } from "../../domain/servicio.enum";
import { METODO_PAGO_VALUES } from "../../domain/metodo-pago.enum";

const PLAN_IDS = ["gratuito", "premium"] as const;

export class CreatePlaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(140)
  descripcionCorta!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  descripcion!: string;

  @IsString()
  categoriaId!: string;

  @IsOptional()
  @IsString()
  subcategoriaId?: string;

  @IsString()
  barrioId!: string;

  @IsString()
  @MaxLength(200)
  direccion!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordenadasDto)
  coordenadas?: CoordenadasDto;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  sitioWeb?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RedSocialDto)
  @ArrayMaxSize(3)
  redesSociales?: RedSocialDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ImagenesDto)
  imagenes?: ImagenesDto;

  @IsEnum(PLAN_IDS)
  planId!: "gratuito" | "premium";

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioDiaDto)
  horarios?: HorarioDiaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioEspecialDto)
  horariosEspeciales?: HorarioEspecialDto[];

  @IsOptional()
  @IsBoolean()
  abierto24x7?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(SERVICIO_VALUES, { each: true })
  servicios?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(METODO_PAGO_VALUES, { each: true })
  metodosPago?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  idiomas?: string[];
}
