import { IsString, IsOptional, IsArray, ArrayMaxSize } from "class-validator";

export class ImagenesDto {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  portada?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, {
    message:
      "Maximum 10 images in gallery (free plan max 3, enforced at service layer)",
  })
  galeria!: string[];
}
