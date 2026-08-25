import { isValidValoracionGoogle } from "./valoracion-google.vo";

describe("isValidValoracionGoogle (characterisation)", () => {
  const valid = {
    rating: 4.5,
    reviewsCount: 12,
    mapsLink: "https://maps.app.goo.gl/x",
  };

  it("accepts a valid value object", () => {
    expect(isValidValoracionGoogle(valid)).toBe(true);
  });

  it("rejects non-object inputs", () => {
    expect(isValidValoracionGoogle(null)).toBe(false);
    expect(isValidValoracionGoogle(undefined)).toBe(false);
    expect(isValidValoracionGoogle("x")).toBe(false);
    expect(isValidValoracionGoogle(4.5)).toBe(false);
  });

  it("rejects rating outside [0, 5], NaN and non-numbers", () => {
    expect(isValidValoracionGoogle({ ...valid, rating: -0.5 })).toBe(false);
    expect(isValidValoracionGoogle({ ...valid, rating: 5.01 })).toBe(false);
    expect(isValidValoracionGoogle({ ...valid, rating: NaN })).toBe(false);
    expect(isValidValoracionGoogle({ ...valid, rating: "5" })).toBe(false);
  });

  it("rejects negative or non-number reviewsCount", () => {
    expect(isValidValoracionGoogle({ ...valid, reviewsCount: -1 })).toBe(false);
    expect(isValidValoracionGoogle({ ...valid, reviewsCount: "10" })).toBe(
      false,
    );
  });

  it("rejects empty or non-string mapsLink", () => {
    expect(isValidValoracionGoogle({ ...valid, mapsLink: "" })).toBe(false);
    expect(isValidValoracionGoogle({ ...valid, mapsLink: 42 })).toBe(false);
  });
});
