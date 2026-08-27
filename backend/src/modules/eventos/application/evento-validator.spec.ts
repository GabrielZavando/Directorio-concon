/**
 * Unit tests for EventoValidator cross-field validation.
 */
import { EventoValidator, EVENTO_SUBCATEGORIAS } from "./evento-validator";
import type { FirebaseService } from "../../../common/services/firebase.service";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockFirebaseService: jest.Mocked<
  Pick<FirebaseService, "documentExists" | "getDocument">
> = {
  documentExists: jest.fn(),
  getDocument: jest.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("EventoValidator", () => {
  let validator: EventoValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebaseService.documentExists.mockResolvedValue(true);
    mockFirebaseService.getDocument.mockImplementation(() =>
      Promise.resolve({
        exists: true,
        data: () => ({
          status: "aprobado",
        }),
      } as any),
    );
    validator = new EventoValidator(
      mockFirebaseService as unknown as FirebaseService,
    );
  });

  // =========================================================================
  // validateFechas
  // =========================================================================
  it("accepts valid fechaInicio < fechaFin", async () => {
    const errors = await validator.validateCreate({
      fechaInicio: "2026-08-15T10:00:00Z",
      fechaFin: "2026-08-17T22:00:00Z",
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      precioTipo: "gratis",
      precioValor: 0,
      publicoObjetivo: ["familia"],
    });
    expect(errors).not.toContainEqual(expect.stringMatching(/fechaFin/));
  });

  it("rejects fechaFin <= fechaInicio", async () => {
    const errors = await validator.validateCreate({
      fechaInicio: "2026-08-17T22:00:00Z",
      fechaFin: "2026-08-15T10:00:00Z",
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      precioTipo: "gratis",
      precioValor: 0,
      publicoObjetivo: ["familia"],
    });
    expect(errors.some((e) => e.includes("fechaFin"))).toBe(true);
  });

  it("rejects equal fechas", async () => {
    const errors = await validator.validateCreate({
      fechaInicio: "2026-08-15T10:00:00Z",
      fechaFin: "2026-08-15T10:00:00Z",
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      precioTipo: "gratis",
      precioValor: 0,
      publicoObjetivo: ["familia"],
    });
    expect(errors.some((e) => e.includes("fechaFin"))).toBe(true);
  });

  // =========================================================================
  // validatePrecio
  // =========================================================================
  it("accepts precioTipo gratis with precioValor 0", async () => {
    const errors = await validator.validateCreate({
      precioTipo: "gratis",
      precioValor: 0,
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      publicoObjetivo: ["familia"],
    });
    expect(errors).not.toContainEqual(expect.stringMatching(/precioValor/));
  });

  it("rejects precioTipo gratis with precioValor > 0", async () => {
    const errors = await validator.validateCreate({
      precioTipo: "gratis",
      precioValor: 5000,
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      publicoObjetivo: ["familia"],
    });
    expect(errors.some((e) => e.includes("precioValor"))).toBe(true);
  });

  it("accepts precioTipo pago with precioValor > 0", async () => {
    const errors = await validator.validateCreate({
      precioTipo: "pago",
      precioValor: 5000,
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      publicoObjetivo: ["familia"],
    });
    expect(errors).not.toContainEqual(expect.stringMatching(/precioValor/));
  });

  it("rejects precioTipo pago with precioValor 0", async () => {
    const errors = await validator.validateCreate({
      precioTipo: "pago",
      precioValor: 0,
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      publicoObjetivo: ["familia"],
    });
    expect(errors.some((e) => e.includes("precioValor"))).toBe(true);
  });

  // =========================================================================
  // validatePublicoObjetivo
  // =========================================================================
  it("rejects empty publicoObjetivo", async () => {
    const errors = await validator.validateCreate({
      publicoObjetivo: [],
      subcategoriaId: "ferias-gastronomicas",
      barrioId: "centro",
      precioTipo: "gratis",
      precioValor: 0,
    });
    expect(errors.some((e) => e.includes("publicoObjetivo"))).toBe(true);
  });

  // =========================================================================
  // validateSubcategoria
  // =========================================================================
  it("rejects invalid subcategoriaId", async () => {
    const errors = await validator.validateCreate({
      subcategoriaId: "invalid-slug",
      barrioId: "centro",
      precioTipo: "gratis",
      precioValor: 0,
      publicoObjetivo: ["familia"],
    });
    expect(
      errors.some((e) => e.includes("Subcategoría inválida o inactiva")),
    ).toBe(true);
  });

  it("accepts valid subcategoriaId", async () => {
    for (const slug of EVENTO_SUBCATEGORIAS) {
      const errors = await validator.validateCreate({
        subcategoriaId: slug,
        barrioId: "centro",
        precioTipo: "gratis",
        precioValor: 0,
        publicoObjetivo: ["familia"],
      });
      expect(
        errors.some((e) => e.includes("Subcategoría inválida o inactiva")),
      ).toBe(false);
    }
  });

  // =========================================================================
  // validateBarrio
  // =========================================================================
  it("rejects non-existent barrio", async () => {
    mockFirebaseService.documentExists.mockResolvedValue(false);

    const errors = await validator.validateCreate({
      barrioId: "non-existent",
      subcategoriaId: "ferias-gastronomicas",
      precioTipo: "gratis",
      precioValor: 0,
      publicoObjetivo: ["familia"],
    });
    expect(errors.some((e) => e.includes("Barrio inválido o inactivo"))).toBe(
      true,
    );
  });

  it("accepts existing barrio", async () => {
    mockFirebaseService.documentExists.mockImplementation(
      async (collection: string) => collection === "barrios",
    );

    const errors = await validator.validateCreate({
      barrioId: "centro",
      subcategoriaId: "ferias-gastronomicas",
      precioTipo: "gratis",
      precioValor: 0,
      publicoObjetivo: ["familia"],
    });
    expect(errors.some((e) => e.includes("Barrio inválido o inactivo"))).toBe(
      false,
    );
  });

  // =========================================================================
  // Multiple errors
  // =========================================================================
  it("returns multiple errors for multiple violations", async () => {
    const errors = await validator.validateCreate({
      fechaInicio: "2026-08-17T22:00:00Z",
      fechaFin: "2026-08-15T10:00:00Z",
      precioTipo: "gratis",
      precioValor: 5000,
      subcategoriaId: "bad-slug",
      barrioId: "non-existent",
      publicoObjetivo: [],
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
