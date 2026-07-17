import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers["user-agent"] || "";
    const now = Date.now();

    // Log de inicio de request
    this.logger.log(`🚀 ${method} ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - now;

          // Log de respuesta exitosa
          this.logger.log(
            `✅ ${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`,
          );

          // Log adicional para operaciones importantes
          if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            this.logger.log(`📝 Operación ${method} completada en ${url}`);
          }
        },
        error: (error) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - now;

          // Log de error
          this.logger.error(
            `❌ ${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`,
            error.stack,
          );
        },
      }),
    );
  }
}
