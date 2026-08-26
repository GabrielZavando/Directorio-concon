import { GALERIA_LIMITS, Imagenes, isValidImagenes } from "./imagenes.vo";

describe("isValidImagenes (characterisation)", () => {
  const validGaleria = ["https://a.cl/1.jpg", "https://a.cl/2.jpg"];

  it("accepts a minimal valid object (empty galeria)", () => {
    expect(isValidImagenes({ galeria: [] })).toBe(true);
  });

  it("accepts optional logo/portada when absent or valid URLs", () => {
    expect(
      isValidImagenes({
        logo: "https://a.cl/logo.png",
        portada: "https://a.cl/cover.png",
        galeria: validGaleria,
      }),
    ).toBe(true);
    expect(isValidImagenes({ galeria: validGaleria })).toBe(true);
  });

  it("rejects non-object inputs", () => {
    expect(isValidImagenes(null)).toBe(false);
    expect(isValidImagenes(undefined)).toBe(false);
    expect(isValidImagenes("imagenes")).toBe(false);
    expect(isValidImagenes(42)).toBe(false);
    expect(isValidImagenes([])).toBe(false);
  });

  it("rejects invalid logo/portada values", () => {
    expect(isValidImagenes({ logo: "not-a-url", galeria: [] })).toBe(false);
    expect(isValidImagenes({ logo: 123, galeria: [] })).toBe(false);
    expect(isValidImagenes({ portada: "broken", galeria: [] })).toBe(false);
  });

  it("rejects galeria entries that are not valid URL strings", () => {
    expect(isValidImagenes({ galeria: ["https://a.cl/1.jpg", "broken"] })).toBe(
      false,
    );
    expect(isValidImagenes({ galeria: [1, 2] as unknown })).toBe(false);
    expect(isValidImagenes({ galeria: "nope" })).toBe(false);
  });

  it("enforces the free plan gallery limit (3)", () => {
    const g4 = [
      "https://a.cl/1.jpg",
      "https://a.cl/2.jpg",
      "https://a.cl/3.jpg",
      "https://a.cl/4.jpg",
    ];
    expect(isValidImagenes({ galeria: g4 }, "gratuito")).toBe(false);
    expect(isValidImagenes({ galeria: g4 }, "premium")).toBe(true);
  });

  it("enforces the premium plan gallery limit (10)", () => {
    const base = "https://a.cl/img-";
    const g11 = Array.from({ length: 11 }, (_, i) => `${base}${i}.jpg`);
    expect(isValidImagenes({ galeria: g11 }, "premium")).toBe(false);
    expect(isValidImagenes({ galeria: g11.slice(0, 10) }, "premium")).toBe(
      true,
    );
  });

  it("defaults to the free plan limit when planId is omitted", () => {
    const g4 = [
      "https://a.cl/1.jpg",
      "https://a.cl/2.jpg",
      "https://a.cl/3.jpg",
      "https://a.cl/4.jpg",
    ];
    expect(isValidImagenes({ galeria: g4 })).toBe(false);
  });

  it("exposes the gallery limits constants", () => {
    expect(GALERIA_LIMITS).toEqual({ gratuito: 3, premium: 10 });
  });
});
