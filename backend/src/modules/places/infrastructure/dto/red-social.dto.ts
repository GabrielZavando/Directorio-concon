import { IsString, IsUrl, ArrayMaxSize } from "class-validator";

export class RedSocialDto {
  @IsString()
  plataforma!: string;

  @IsUrl({}, { message: "url must be a valid URL" })
  url!: string;
}

export class RedesSocialesDto {
  @ArrayMaxSize(3, { message: "Maximum 3 social networks" })
  redes!: RedSocialDto[];
}
