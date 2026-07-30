import { IsEnum, IsUrl, ArrayMaxSize } from "class-validator";
import {
  PLATAFORMA_SOCIAL_VALUES,
  type PlataformaSocialEnum,
} from "../../domain/plataforma-social.enum";

export class RedSocialDto {
  @IsEnum(PLATAFORMA_SOCIAL_VALUES, {
    message:
      "plataforma must be one of: instagram, facebook, x-twitter, linkedin, tiktok, youtube",
  })
  plataforma!: PlataformaSocialEnum;

  @IsUrl({}, { message: "url must be a valid URL" })
  url!: string;
}

export class RedesSocialesDto {
  @ArrayMaxSize(3, { message: "Maximum 3 social networks" })
  redes!: RedSocialDto[];
}
