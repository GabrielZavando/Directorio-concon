import { Subcategoria } from "./subcategoria.vo";

describe("Subcategoria VO", () => {
  it("construye con los campos requeridos", () => {
    const sub = new Subcategoria({
      slug: "restaurantes",
      nombre: "Restaurantes",
      activo: true,
    });
    expect(sub.slug).toBe("restaurantes");
    expect(sub.nombre).toBe("Restaurantes");
    expect(sub.activo).toBe(true);
  });

  it("activo default es true", () => {
    const sub = new Subcategoria({ slug: "hoteles", nombre: "Hoteles" });
    expect(sub.activo).toBe(true);
  });

  it("equivalencia por slug", () => {
    const a = new Subcategoria({
      slug: "restaurantes",
      nombre: "Restaurantes",
      activo: true,
    });
    const b = new Subcategoria({
      slug: "restaurantes",
      nombre: "RESTAURANTES",
      activo: false,
    });
    const c = new Subcategoria({
      slug: "cafeterias",
      nombre: "Cafeterías",
      activo: true,
    });
    expect(a.equals(b)).toBe(true); // mismo slug
    expect(a.equals(c)).toBe(false);
  });

  it("lanza si slug está vacío", () => {
    expect(() => new Subcategoria({ slug: "", nombre: "X" })).toThrow();
  });

  it("lanza si slug tiene mayúsculas o espacios", () => {
    expect(
      () => new Subcategoria({ slug: "Restaurantes", nombre: "X" }),
    ).toThrow();
    expect(
      () => new Subcategoria({ slug: "con espacios", nombre: "X" }),
    ).toThrow();
  });

  it("lanza si nombre está vacío", () => {
    expect(() => new Subcategoria({ slug: "x", nombre: "" })).toThrow();
  });

  it("lanza si activo no es boolean", () => {
    expect(
      // @ts-expect-error - testing runtime guard
      () => new Subcategoria({ slug: "x", nombre: "Y", activo: "yes" }),
    ).toThrow();
  });

  it("withActivo produce una copia inmutable", () => {
    const original = new Subcategoria({ slug: "x", nombre: "Y", activo: true });
    const updated = original.withActivo(false);
    expect(original.activo).toBe(true);
    expect(updated.activo).toBe(false);
    expect(updated.slug).toBe("x");
  });
});
