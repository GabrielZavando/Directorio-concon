import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponseMeta {
  timestamp: string;
  path: string;
  method: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  meta?: ApiResponseMeta;
}

interface PaginatedPayload {
  items?: unknown;
  results?: unknown;
  data?: unknown;
  total?: number;
  totalCount?: number;
  page?: number;
  currentPage?: number;
  limit?: number;
  pageSize?: number;
}

interface PayloadWithMessage {
  message: string;
  data?: unknown;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  // SOLID: OCP — success message resolved by HTTP method via lookup, no switch.
  private static readonly MESSAGES_BY_METHOD: Record<string, string> = {
    POST: "Recurso creado exitosamente",
    PUT: "Recurso actualizado exitosamente",
    PATCH: "Recurso actualizado exitosamente",
    DELETE: "Recurso eliminado exitosamente",
    GET: "Operación completada exitosamente",
  };

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<{
      url: string;
      method: string;
    }>();
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>();

    return next
      .handle()
      .pipe(
        map((data: unknown) => this.buildResponse(data, request, response)),
      );
  }

  private buildResponse(
    data: unknown,
    request: { url: string; method: string },
    response: { statusCode: number },
  ): ApiResponse<T> {
    // Already wrapped — pass through unchanged.
    if (this.isApiResponse(data)) {
      return data as ApiResponse<T>;
    }

    const baseMeta: ApiResponseMeta = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (this.isPaginated(data)) {
      return this.buildPaginatedResponse(data, baseMeta, response.statusCode);
    }

    return this.buildSimpleResponse(data, baseMeta, response.statusCode);
  }

  private buildPaginatedResponse(
    data: PaginatedPayload,
    baseMeta: ApiResponseMeta,
    statusCode: number,
  ): ApiResponse<T> {
    const limit = data.limit ?? data.pageSize ?? 20;
    const total = data.total ?? data.totalCount ?? 0;
    return {
      success: true,
      statusCode,
      message: this.resolveMessage(data, baseMeta.method),
      data: (data.items ?? data.results ?? data.data) as T,
      meta: {
        ...baseMeta,
        total,
        page: data.page ?? data.currentPage ?? 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildSimpleResponse(
    data: unknown,
    baseMeta: ApiResponseMeta,
    statusCode: number,
  ): ApiResponse<T> {
    const message = this.resolveMessage(data, baseMeta.method);
    const responseData = this.isPayloadWithMessage(data)
      ? (data.data as T)
      : (data as T);
    return {
      success: true,
      statusCode,
      message,
      data: responseData,
      meta: baseMeta,
    };
  }

  private resolveMessage(data: unknown, method: string): string {
    const defaultMessage =
      TransformInterceptor.MESSAGES_BY_METHOD[method] ??
      TransformInterceptor.MESSAGES_BY_METHOD.GET;

    return this.isPayloadWithMessage(data) ? data.message : defaultMessage;
  }

  private isApiResponse(data: unknown): data is ApiResponse<unknown> {
    return data !== null && typeof data === "object" && "success" in data;
  }

  private isPayloadWithMessage(data: unknown): data is PayloadWithMessage {
    return data !== null && typeof data === "object" && "message" in data;
  }

  private isPaginated(data: unknown): data is PaginatedPayload {
    if (data === null || typeof data !== "object") {
      return false;
    }
    const hasCollection =
      "items" in data || "results" in data || "data" in data;
    const hasTotal = "total" in data || "totalCount" in data;
    return hasCollection && hasTotal;
  }
}
