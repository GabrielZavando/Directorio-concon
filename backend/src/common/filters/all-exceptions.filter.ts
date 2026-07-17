import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status: number;
    let message: string | object;
    let error: string;

    if (exception instanceof HttpException) {
      // Excepciones HTTP de NestJS
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
        error = exception.constructor.name;
      } else if (typeof exceptionResponse === "object") {
        message = (exceptionResponse as any).message || exceptionResponse;
        error = (exceptionResponse as any).error || exception.constructor.name;
      }
    } else if (exception instanceof Error) {
      // Errores de Firebase u otros
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = this.getFirebaseErrorMessage(exception);
      error = exception.constructor.name;

      // Log completo del error para debugging
      this.logger.error(
        `Error interno: ${exception.message}`,
        exception.stack,
        "AllExceptionsFilter",
      );
    } else {
      // Errores desconocidos
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Error interno del servidor";
      error = "InternalServerError";

      this.logger.error(
        `Error desconocido: ${JSON.stringify(exception)}`,
        "AllExceptionsFilter",
      );
    }

    // Estructura de respuesta consistente
    const errorResponse = {
      success: false,
      statusCode: status,
      error: error,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(process.env.NODE_ENV === "development" && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Log del error (excepto para errores 4xx comunes)
    if (
      status >= 500 ||
      (status >= 400 && status < 500 && this.shouldLogClientError(status))
    ) {
      this.logger.error(
        `HTTP ${status} - ${request.method} ${request.url}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Convierte errores de Firebase en mensajes más amigables
   */
  private getFirebaseErrorMessage(error: Error): string {
    const message = error.message;

    // Errores de autenticación
    if (message.includes("auth/id-token-expired")) {
      return "Token de autenticación expirado";
    }
    if (message.includes("auth/id-token-revoked")) {
      return "Token de autenticación revocado";
    }
    if (message.includes("auth/invalid-id-token")) {
      return "Token de autenticación inválido";
    }
    if (message.includes("auth/user-not-found")) {
      return "Usuario no encontrado";
    }

    // Errores de Firestore
    if (message.includes("permission-denied")) {
      return "No tienes permisos para realizar esta acción";
    }
    if (message.includes("not-found")) {
      return "Recurso no encontrado";
    }
    if (message.includes("already-exists")) {
      return "El recurso ya existe";
    }
    if (message.includes("failed-precondition")) {
      return "No se cumplieron las condiciones necesarias";
    }
    if (message.includes("resource-exhausted")) {
      return "Se ha superado el límite de recursos disponibles";
    }

    // Errores de Storage
    if (message.includes("storage/object-not-found")) {
      return "Archivo no encontrado";
    }
    if (message.includes("storage/unauthorized")) {
      return "No tienes permisos para acceder a este archivo";
    }
    if (message.includes("storage/quota-exceeded")) {
      return "Se ha superado la cuota de almacenamiento";
    }

    // Error genérico
    return "Error interno del servidor";
  }

  /**
   * Determina si se debe hacer log de errores 4xx
   */
  private shouldLogClientError(status: number): boolean {
    // Log de errores importantes del cliente
    const importantClientErrors = [401, 403, 429]; // Unauthorized, Forbidden, Too Many Requests
    return importantClientErrors.includes(status);
  }
}
