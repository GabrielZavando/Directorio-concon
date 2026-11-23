import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  HttpException,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { FirebaseError } from "firebase-admin";
import { RegisterDto } from "./dto/register.dto";
import { AuthService } from "../application/auth.service";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  Public,
} from "@/modules/auth/application/public.decorator";
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards()
  @Post("registro")
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Usuario creado exitosamente",
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Datos de entrada inválidos (whitelist/enum)",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "El email ya está registrado en Firebase Auth",
  })
  @Public()
  async registro(@Body() dto: RegisterDto, @Res() res: Response) {
    try {
      const result = await this.authService.registerWithRole(dto);
      return res.status(HttpStatus.CREATED).json({
        uid: result.uid,
        email: result.email,
        rol: result.rol,
        nombre: result.nombre,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (
        error instanceof FirebaseError &&
        error.code === "auth/email-already-exists"
      ) {
        throw new HttpException(
          {
            status: HttpStatus.CONFLICT,
            message: "El email ya está registrado",
          },
          HttpStatus.CONFLICT,
        );
      }
      if (error instanceof Error && error.message?.includes("email-already")) {
        throw new HttpException(
          {
            status: HttpStatus.CONFLICT,
            message: "El email ya está registrado",
          },
          HttpStatus.CONFLICT,
        );
      }
      throw new HttpException(
        { status: HttpStatus.INTERNAL_SERVER_ERROR, message: "Error interno" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
