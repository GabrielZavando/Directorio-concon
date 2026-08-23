import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

// SOLID: typed contract for the documented error response envelope
// (mirrors docs/api-spec.yml `Error` schema).
interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | object;
  timestamp: string;
  path: string;
  method: string;
  stack?: string;
}

// Shape of a NestJS HttpException object response.
interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
}

interface ResolvedError {
  status: number;
  message: string | object;
  error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  // SOLID: OCP — adding a new Firebase mapping is adding one tuple, not a new branch.
  private static readonly FIREBASE_MESSAGE_MAP: ReadonlyArray<
    [string, string]
  > = [
    ["auth/id-token-expired", "Token de autenticación expirado"],
    ["auth/id-token-revoked", "Token de autenticación revocado"],
    ["auth/invalid-id-token", "Token de autenticación inválido"],
    ["auth/user-not-found", "Usuario no encontrado"],
    ["permission-denied", "No tienes permisos para realizar esta acción"],
    ["not-found", "Recurso no encontrado"],
    ["already-exists", "El recurso ya existe"],
    ["failed-precondition", "No se cumplieron las condiciones necesarias"],
    ["resource-exhausted", "Se ha superado el límite de recursos disponibles"],
    ["storage/object-not-found", "Archivo no encontrado"],
    ["storage/unauthorized", "No tienes permisos para acceder a este archivo"],
    ["storage/quota-exceeded", "Se ha superado la cuota de almacenamiento"],
  ];

  // SOLID: SRP — orchestration only; delegates resolution/logging/response building.
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const resolved = this.resolveError(exception);
    this.logIfNeeded(resolved.status, request, exception);

    response
      .status(resolved.status)
      .json(this.buildErrorResponse(resolved, request, exception));
  }

  private resolveError(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      return this.resolveHttpException(exception);
    }
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: this.mapFirebaseMessage(exception.message),
        error: exception.constructor.name,
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Error interno del servidor",
      error: "InternalServerError",
    };
  }

  private resolveHttpException(exception: HttpException): ResolvedError {
    const status = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === "string") {
      return {
        status,
        message: response,
        error: exception.constructor.name,
      };
    }

    const typed = this.asHttpExceptionResponse(response);
    return {
      status,
      message: typed.message ?? response,
      error: typed.error ?? exception.constructor.name,
    };
  }

  private asHttpExceptionResponse(response: unknown): HttpExceptionResponse {
    if (
      response !== null &&
      typeof response === "object" &&
      ("message" in response || "error" in response)
    ) {
      return response as HttpExceptionResponse;
    }
    return {};
  }

  private mapFirebaseMessage(message: string): string {
    const match = AllExceptionsFilter.FIREBASE_MESSAGE_MAP.find(([key]) =>
      message.includes(key),
    );
    return match ? match[1] : "Error interno del servidor";
  }

  private logIfNeeded(
    status: number,
    request: Request,
    exception: unknown,
  ): void {
    const isServerError = status >= 500;
    const isLoggableClientError =
      status >= 400 && status < 500 && this.shouldLogClientError(status);
    if (!isServerError && !isLoggableClientError) {
      return;
    }
    this.logger.error(
      `HTTP ${status} - ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );
  }

  private shouldLogClientError(status: number): boolean {
    const importantClientErrors = [401, 403, 429];
    return importantClientErrors.includes(status);
  }

  private buildErrorResponse(
    resolved: ResolvedError,
    request: Request,
    exception: unknown,
  ): ApiErrorResponse {
    const includeStack =
      process.env.NODE_ENV === "development" && exception instanceof Error;
    return {
      success: false,
      statusCode: resolved.status,
      error: resolved.error,
      message: resolved.message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(includeStack ? { stack: (exception as Error).stack } : {}),
    };
  }
}
