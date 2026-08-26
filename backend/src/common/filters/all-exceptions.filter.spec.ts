import { AllExceptionsFilter } from "./all-exceptions.filter";
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

interface CapturedResponse {
  statusCode: number;
  body: Record<string, unknown>;
}

function createHost(
  method = "GET",
  url = "/api/v1/places",
): { host: ArgumentsHost; capture: CapturedResponse } {
  const capture: CapturedResponse = { statusCode: 0, body: {} };
  const request = { method, url } as Request;
  const response = {
    status(code: number) {
      capture.statusCode = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      capture.body = payload;
      return this;
    },
  } as unknown as Response;

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, capture };
}

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("wraps an HttpException with a string response", () => {
    const { host, capture } = createHost();
    const exception = new HttpException("Recurso no encontrado", 404);

    filter.catch(exception, host);

    expect(capture.statusCode).toBe(404);
    expect(capture.body.success).toBe(false);
    expect(capture.body.statusCode).toBe(404);
    expect(capture.body.message).toBe("Recurso no encontrado");
    expect(capture.body.error).toBe("HttpException");
    expect(capture.body.path).toBe("/api/v1/places");
    expect(capture.body.method).toBe("GET");
    expect(typeof capture.body.timestamp).toBe("string");
  });

  it("wraps an HttpException with an object response (message + error)", () => {
    const { host, capture } = createHost("POST", "/api/v1/places");
    const exception = new HttpException(
      { message: "Campo inválido", error: "Bad Request" },
      400,
    );

    filter.catch(exception, host);

    expect(capture.statusCode).toBe(400);
    expect(capture.body.message).toBe("Campo inválido");
    expect(capture.body.error).toBe("Bad Request");
    expect(capture.body.method).toBe("POST");
  });

  it("maps a Firebase auth error to a friendly Spanish message", () => {
    const { host, capture } = createHost();
    const exception = new Error("Firebase: auth/id-token-expired");

    filter.catch(exception, host);

    expect(capture.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(capture.body.message).toBe("Token de autenticación expirado");
    expect(capture.body.success).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("falls back to generic message for unknown Firebase errors", () => {
    const { host, capture } = createHost();
    const exception = new Error("random firebase failure");

    filter.catch(exception, host);

    expect(capture.body.message).toBe("Error interno del servidor");
  });

  it("handles non-Error, non-HttpException values", () => {
    const { host, capture } = createHost();
    const exception = "unexpected string boom";

    filter.catch(exception as unknown, host);

    expect(capture.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(capture.body.message).toBe("Error interno del servidor");
    expect(capture.body.error).toBe("InternalServerError");
  });

  it("does not include stack in production responses", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const { host, capture } = createHost();
    filter.catch(new Error("auth/id-token-revoked"), host);
    expect(capture.body.stack).toBeUndefined();
    process.env.NODE_ENV = prev;
  });

  it("exposes stack in development responses", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const { host, capture } = createHost();
    const err = new Error("auth/invalid-id-token");
    filter.catch(err, host);
    expect(capture.body.stack).toBe(err.stack);
    process.env.NODE_ENV = prev;
  });
});
