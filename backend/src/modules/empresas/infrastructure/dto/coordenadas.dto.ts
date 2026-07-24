import { IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CoordenadasDto {
  @ApiProperty({ description: "Latitude", example: -32.9175 })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: "Longitude", example: -71.5103 })
  @IsNumber()
  lng: number;
}
