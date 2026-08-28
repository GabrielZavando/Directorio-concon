/**
 * Unit tests for the Ubicacion value object guard.
 */
import { isValidUbicacion, type Ubicacion } from "./ubicacion.vo";

describe("isValidUbicacion", () => {
  const valid: Ubicacion = {
    nombreLugar: "Playa Amarilla",
    direccion: "Av. Costanera 100",
    coordenadas: { lat: -33.4, lng: -71.6 },
  };

  it("accepts a valid ubicacion", () => {
    expect(isValidUbicacion(valid)).toBe(true);
  });

  it("accepts a ubicacion without nombreLugar", () => {
    const withoutName: Ubicacion = {
      direccion: "Calle 5",
      coordenadas: { lat: 1, lng: 2 },
    };
    expect(isValidUbicacion(withoutName)).toBe(true);
  });

  it("rejects null and non-objects", () => {
    expect(isValidUbicacion(null)).toBe(false);
    expect(isValidUbicacion("x")).toBe(false);
  });

  it("rejects an empty direccion", () => {
    expect(
      isValidUbicacion({ direccion: "", coordenadas: { lat: 1, lng: 2 } }),
    ).toBe(false);
  });

  it("rejects missing or invalid coordenadas", () => {
    expect(isValidUbicacion({ direccion: "x" })).toBe(false);
    expect(isValidUbicacion({ direccion: "x", coordenadas: { lat: 1 } })).toBe(
      false,
    );
  });

  it("rejects a non-string nombreLugar", () => {
    expect(
      isValidUbicacion({
        nombreLugar: 5,
        direccion: "x",
        coordenadas: { lat: 1, lng: 2 },
      }),
    ).toBe(false);
  });

  // -- CH-04c: direccion is now optional; only coordenadas is mandatory --

  it("accepts a ubicacion with coordenadas and no direccion", () => {
    expect(isValidUbicacion({ coordenadas: { lat: -32.9, lng: -71.5 } })).toBe(
      true,
    );
  });

  it("accepts a ubicacion with coordenadas, direccion and nombreLugar all optional-filled", () => {
    expect(
      isValidUbicacion({
        nombreLugar: "Plaza",
        coordenadas: { lat: -32.9, lng: -71.5 },
      }),
    ).toBe(true);
  });

  it("rejects an object without coordenadas even if direccion present", () => {
    expect(isValidUbicacion({ direccion: "Av. Marina 123" })).toBe(false);
  });

  it("rejects an empty (but defined) direccion", () => {
    expect(
      isValidUbicacion({ direccion: "", coordenadas: { lat: 1, lng: 2 } }),
    ).toBe(false);
  });
});
