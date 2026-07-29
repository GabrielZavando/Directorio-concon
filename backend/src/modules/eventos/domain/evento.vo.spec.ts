/**
 * Domain tests for value objects and enums.
 * Validates pure validation logic (no framework deps).
 */
import { isValidCoordenadas } from "./coordenadas.vo";
import { PRECIO_TIPO_VALUES, type PrecioTipo } from "./precio-tipo.enum";
import { PRECIO_MONEDA_VALUES, type PrecioMoneda } from "./precio-moneda.enum";
import {
  PUBLICO_OBJETIVO_VALUES,
  type PublicoObjetivoEnum,
} from "./publico-objetivo.enum";
import {
  ACCESIBILIDAD_VALUES,
  type AccesibilidadEnum,
} from "./accesibilidad.enum";
import { NIVEL_RUIDO_VALUES, type NivelRuido } from "./nivel-ruido.enum";

// ---------------------------------------------------------------------------
// Coordenadas (reused from places)
// ---------------------------------------------------------------------------
describe("Coordenadas VO", () => {
  it("accepts valid coordinates", () => {
    expect(isValidCoordenadas({ lat: -33.01, lng: -71.54 })).toBe(true);
    expect(isValidCoordenadas({ lat: 0, lng: 0 })).toBe(true);
    expect(isValidCoordenadas({ lat: -90, lng: -180 })).toBe(true);
    expect(isValidCoordenadas({ lat: 90, lng: 180 })).toBe(true);
  });

  it("rejects out-of-range latitude", () => {
    expect(isValidCoordenadas({ lat: -91, lng: 0 })).toBe(false);
    expect(isValidCoordenadas({ lat: 91, lng: 0 })).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    expect(isValidCoordenadas({ lat: 0, lng: -181 })).toBe(false);
    expect(isValidCoordenadas({ lat: 0, lng: 181 })).toBe(false);
  });

  it("rejects non-numeric values", () => {
    expect(isValidCoordenadas({ lat: "abc", lng: 0 })).toBe(false);
    expect(isValidCoordenadas({ lat: 0, lng: NaN })).toBe(false);
    expect(isValidCoordenadas({ lat: Infinity, lng: 0 })).toBe(false);
  });

  it("rejects null and non-objects", () => {
    expect(isValidCoordenadas(null)).toBe(false);
    expect(isValidCoordenadas("string")).toBe(false);
    expect(isValidCoordenadas(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PrecioTipo enum
// ---------------------------------------------------------------------------
describe("PrecioTipo enum", () => {
  it("has exactly 4 values", () => {
    expect(PRECIO_TIPO_VALUES).toEqual([
      "gratis",
      "pago",
      "donacion",
      "invitacion",
    ]);
  });

  it("supports all PrecioTipo values as a type", () => {
    const validValues: readonly PrecioTipo[] = PRECIO_TIPO_VALUES;
    expect(validValues.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// PrecioMoneda enum
// ---------------------------------------------------------------------------
describe("PrecioMoneda enum", () => {
  it("has exactly 2 values", () => {
    expect(PRECIO_MONEDA_VALUES).toEqual(["CLP", "USD"]);
  });

  it("supports all PrecioMoneda values as a type", () => {
    const validValues: readonly PrecioMoneda[] = PRECIO_MONEDA_VALUES;
    expect(validValues.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// PublicoObjetivoEnum
// ---------------------------------------------------------------------------
describe("PublicoObjetivoEnum", () => {
  it("has exactly 7 values", () => {
    expect(PUBLICO_OBJETIVO_VALUES).toEqual([
      "familia",
      "adultos",
      "tercera_edad",
      "mascotas",
      "todos",
      "ninos",
      "adolescentes",
    ]);
  });

  it("supports all PublicoObjetivoEnum values as a type", () => {
    const validValues: readonly PublicoObjetivoEnum[] = PUBLICO_OBJETIVO_VALUES;
    expect(validValues.length).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// AccesibilidadEnum
// ---------------------------------------------------------------------------
describe("AccesibilidadEnum", () => {
  it("has exactly 6 values", () => {
    expect(ACCESIBILIDAD_VALUES).toEqual([
      "acceso-silla-ruedas",
      "banos-accesibles",
      "estacionamiento-reservado",
      "interprete-señas",
      "material-braille",
      "rampa-acceso",
    ]);
  });

  it("supports all AccesibilidadEnum values as a type", () => {
    const validValues: readonly AccesibilidadEnum[] = ACCESIBILIDAD_VALUES;
    expect(validValues.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// NivelRuido
// ---------------------------------------------------------------------------
describe("NivelRuido", () => {
  it("has exactly 3 values", () => {
    expect(NIVEL_RUIDO_VALUES).toEqual(["bajo", "medio", "alto"]);
  });

  it("supports all NivelRuido values as a type", () => {
    const validValues: readonly NivelRuido[] = NIVEL_RUIDO_VALUES;
    expect(validValues.length).toBe(3);
  });
});
