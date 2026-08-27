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
});
