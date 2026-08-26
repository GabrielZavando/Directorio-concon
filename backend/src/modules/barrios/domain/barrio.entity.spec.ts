import { Barrio } from "./barrio.entity";

describe("Barrio entity", () => {
  const validProps = {
    id: "higuerillas",
    nombre: "Higuerillas",
    slug: "higuerillas",
    tipo: "urbano" as const,
  } as const;

  it("construye con campos requeridos y defaults", () => {
    const b = new Barrio({ ...validProps });
    expect(b.id).toBe("higuerillas");
    expect(b.nombre).toBe("Higuerillas");
    expect(b.slug).toBe("higuerillas");
    expect(b.tipo).toBe("urbano");
    expect(b.activo).toBe(true);
    expect(b.descripcion).toBeUndefined();
    expect(b.territorio).toBeUndefined();
    expect(b.coordenadas).toBeUndefined();
    expect(b.codigo).toBeUndefined();
  });

  it("acepta campos opcionales", () => {
    const b = new Barrio({
      ...validProps,
      descripcion: "Zona costera",
      territorio: "Costa norte",
      coordenadas: { lat: -33.0, lng: -71.5 },
      codigo: "UV-01",
    });
    expect(b.descripcion).toBe("Zona costera");
    expect(b.territorio).toBe("Costa norte");
    expect(b.coordenadas).toEqual({ lat: -33.0, lng: -71.5 });
    expect(b.codigo).toBe("UV-01");
  });

  it("lanza si nombre vacío", () => {
    expect(() => new Barrio({ ...validProps, nombre: "" })).toThrow();
  });

  it("lanza si slug tiene mayúsculas", () => {
    expect(() => new Barrio({ ...validProps, slug: "Higuerillas" })).toThrow();
  });

  it("lanza si tipo inválido", () => {
    // @ts-expect-error - testing runtime guard for invalid tipo
    expect(() => new Barrio({ ...validProps, tipo: "industrial" })).toThrow();
  });

  it("deactivate/activate retornan nueva instancia", () => {
    const b = new Barrio({ ...validProps });
    const d = b.deactivate();
    expect(b.activo).toBe(true);
    expect(d.activo).toBe(false);
    const a = d.activate();
    expect(a.activo).toBe(true);
  });
});
