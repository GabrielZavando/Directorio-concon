import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  meta?: {
    timestamp: string;
    path: string;
    method: string;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    return next.handle().pipe(
      map((data) => {
        // Si data ya tiene formato de respuesta API, retornarlo tal como está
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Detectar si es una respuesta paginada
        const isPaginated = data && 
          typeof data === 'object' && 
          ('items' in data || 'results' in data) &&
          ('total' in data || 'totalCount' in data);

        let responseData: T;
        let meta: any = {
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        };

        if (isPaginated) {
          // Manejar respuesta paginada
          const items = (data as any).items || (data as any).results || (data as any).data;
          const total = (data as any).total || (data as any).totalCount;
          const page = (data as any).page || (data as any).currentPage || 1;
          const limit = (data as any).limit || (data as any).pageSize || 20;
          const totalPages = Math.ceil(total / limit);

          responseData = items as T;
          meta = {
            ...meta,
            total,
            page,
            limit,
            totalPages,
          };
        } else {
          // Respuesta simple
          responseData = data;
        }

        // Determinar mensaje de éxito según el método HTTP
        let message: string;
        switch (request.method) {
          case 'POST':
            message = 'Recurso creado exitosamente';
            break;
          case 'PUT':
          case 'PATCH':
            message = 'Recurso actualizado exitosamente';
            break;
          case 'DELETE':
            message = 'Recurso eliminado exitosamente';
            break;
          case 'GET':
          default:
            message = 'Operación completada exitosamente';
            break;
        }

        // Si data es un objeto con message personalizado, usarlo
        if (data && typeof data === 'object' && 'message' in data) {
          message = (data as any).message;
          // Remover message de los datos para evitar duplicación
          if ('data' in data) {
            responseData = (data as any).data;
          }
        }

        return {
          success: true,
          statusCode: response.statusCode,
          message,
          data: responseData,
          meta,
        };
      }),
    );
  }
}