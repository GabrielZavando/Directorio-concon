import { TransformInterceptor } from "./transform.interceptor";
import { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { lastValueFrom } from "rxjs";

describe("TransformInterceptor", () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockContext: Partial<ExecutionContext>;
  let mockCallHandler: Partial<CallHandler>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          url: "/api/v1/eventos",
          method: "GET",
        }),
        getResponse: jest.fn().mockReturnValue({
          statusCode: 200,
        }),
      }),
    };
  });

  function createCallHandler(data: unknown): Partial<CallHandler> {
    return {
      handle: jest.fn().mockReturnValue(of(data)),
    };
  }

  describe("simple responses", () => {
    it("wraps a single object in success/data/meta", async () => {
      mockCallHandler = createCallHandler({ id: "1", nombre: "Test" });
      const result = await lastValueFrom(
        interceptor.intercept(
          mockContext as ExecutionContext,
          mockCallHandler as CallHandler,
        ),
      );

      expect(result).toMatchObject({
        success: true,
        statusCode: 200,
        message: "Operación completada exitosamente",
        data: { id: "1", nombre: "Test" },
      });
      expect(result.meta).toMatchObject({
        path: "/api/v1/eventos",
        method: "GET",
      });
    });

    it("wraps an array in success/data", async () => {
      mockCallHandler = createCallHandler([{ id: "1" }, { id: "2" }]);
      const result = await lastValueFrom(
        interceptor.intercept(
          mockContext as ExecutionContext,
          mockCallHandler as CallHandler,
        ),
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: "1" }, { id: "2" }]);
    });

    it("returns success message for POST requests", async () => {
      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: "/api/v1/eventos",
            method: "POST",
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 201,
          }),
        }),
      };
      mockCallHandler = createCallHandler({ id: "1" });

      const result = await lastValueFrom(
        interceptor.intercept(
          mockContext as ExecutionContext,
          mockCallHandler as CallHandler,
        ),
      );

      expect(result.message).toBe("Recurso creado exitosamente");
      expect(result.statusCode).toBe(201);
    });

    it("returns success message for PUT requests", async () => {
      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: "/api/v1/eventos/1",
            method: "PUT",
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      };
      mockCallHandler = createCallHandler({ id: "1" });

      const result = await lastValueFrom(
        interceptor.intercept(
          mockContext as ExecutionContext,
          mockCallHandler as CallHandler,
        ),
      );

      expect(result.message).toBe("Recurso actualizado exitosamente");
    });

    it("returns success message for DELETE requests", async () => {
      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: "/api/v1/eventos/1",
            method: "DELETE",
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      };
      mockCallHandler = createCallHandler(null);

      const result = await lastValueFrom(
        interceptor.intercept(
          mockContext as ExecutionContext,
          mockCallHandler as CallHandler,
        ),
      );

      expect(result.message).toBe("Recurso eliminado exitosamente");
    });
  });

  describe("paginated responses", () => {
    it("wraps { items, total } into data/meta", async () => {
      mockCallHandler = createCallHandler({
        items: [{ id: "1" }, { id: "2" }],
        total: 10,
        page: 1,
        limit: 2,
      });

      const result = await lastValueFrom(
        interceptor.intercept(
          mockContext as ExecutionContext,
          mockCallHandler as CallHandler,
        ),
      );

      expect(result.data).toEqual([{ id: "1" }, { id: "2" }]);
      expect(result.meta).toMatchObject({
        total: 10,
        page: 1,
        limit: 2,
        totalPages: 5,
      });
    });

    it("wraps { results, totalCount } into data/meta", async () => {
      mockCallHandler = createCallHandler({
        results: [{ id: "3" }],
        totalCount: 1,
      });

      const result = await lastValueFrom(
        interceptor.intercept(
          mockContext as ExecutionContext,
          mockCallHandler as CallHandler,
        ),
      );

      expect(result.data).toEqual([{ id: "3" }]);
      expect(result.meta).toMatchObject({
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  describe("already-wrapped responses", () => {
    it("passes through if response already has success field", async () => {
      const alreadyWrapped = { success: false, data: null };
      mockCallHandler = createCallHandler(alreadyWrapped);

      const result = await lastValueFrom(
        interceptor.intercept(
          mockContext as ExecutionContext,
          mockCallHandler as CallHandler,
        ),
      );

      expect(result).toEqual(alreadyWrapped);
    });
  });

  describe("message extraction", () => {
    it("extracts custom message from data object", async () => {
      mockCallHandler = createCallHandler({
        message: "Personalizado",
        data: { id: "1" },
      });

      const result = await lastValueFrom(
        interceptor.intercept(
          mockContext as ExecutionContext,
          mockCallHandler as CallHandler,
        ),
      );

      expect(result.message).toBe("Personalizado");
      expect(result.data).toEqual({ id: "1" });
    });
  });
});
