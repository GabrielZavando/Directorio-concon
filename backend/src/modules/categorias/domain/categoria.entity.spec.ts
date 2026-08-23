import { Categoria } from "./categoria.entity";
import { Subcategoria } from "./subcategoria.vo";

describe("Categoria entity", () => {
  const validProps = {
    id: "gastronomia",
    nombre: "Gastronomía",
    slug: "gastronomia",
    icono: "utensils",
    orden: 1,
  } as const;

  it("construye con los campos requeridos y defaults razonables", () => {
    const cat = new Categoria({ ...validProps });
    expect(cat.id).toBe("gastronomia");
    expect(cat.nombre).toBe("Gastronomía");
    expect(cat.slug).toBe("gastronomia");
    expect(cat.icono).toBe("utensils");
    expect(cat.orden).toBe(1);
    expect(cat.activo).toBe(true);
    expect(cat.subcategorias).toEqual([]);
  });

  it("acepta descripcion y color opcionales", () => {
    const cat = new Categoria({
      ...validProps,
      descripcion: "Restaurantes, cafeterías, etc.",
      color: "#fadeba",
    });
    expect(cat.descripcion).toBe("Restaurantes, cafeterías, etc.");
    expect(cat.color).toBe("#fadeba");
  });

  it("acepta un array de subcategorias pre-cargado", () => {
    const sub = new Subcategoria({
      slug: "restaurantes",
      nombre: "Restaurantes",
      activo: true,
    });
    const cat = new Categoria({ ...validProps, subcategorias: [sub] });
    expect(cat.subcategorias).toHaveLength(1);
    expect(cat.subcategorias[0].slug).toBe("restaurantes");
  });

  it("acepta timestamps explícitos", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const cat = new Categoria({
      ...validProps,
      createdAt: now,
      updatedAt: now,
    });
    expect(cat.createdAt).toBe(now);
    expect(cat.updatedAt).toBe(now);
  });

  it("lanza si nombre está vacío", () => {
    expect(() => new Categoria({ ...validProps, nombre: "" })).toThrow();
  });

  it("lanza si slug tiene mayúsculas", () => {
    expect(
      () => new Categoria({ ...validProps, slug: "Gastronomia" }),
    ).toThrow();
  });

  it("lanza si orden es 0 o negativo", () => {
    expect(() => new Categoria({ ...validProps, orden: 0 })).toThrow();
    expect(() => new Categoria({ ...validProps, orden: -1 })).toThrow();
  });

  it("lanza si icono es vacío", () => {
    expect(() => new Categoria({ ...validProps, icono: "" })).toThrow();
  });

  it("desactiva vía método deactivate() sin mutar el original", () => {
    const cat = new Categoria({ ...validProps });
    const deactivated = cat.deactivate();
    expect(cat.activo).toBe(true); // original intacto
    expect(deactivated.activo).toBe(false);
    expect(deactivated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      cat.updatedAt.getTime(),
    );
  });

  it("reactiva vía método activate()", () => {
    const cat = new Categoria({ ...validProps, activo: false });
    const activated = cat.activate();
    expect(activated.activo).toBe(true);
    expect(cat.activo).toBe(false); // original intacto
  });

  describe("addSubcategoria", () => {
    it("agrega una subcategoria preservando el array original", () => {
      const cat = new Categoria({ ...validProps });
      const newSub = new Subcategoria({
        slug: "cafeterias",
        nombre: "Cafeterías",
        activo: true,
      });
      const updated = cat.addSubcategoria(newSub);
      expect(cat.subcategorias).toHaveLength(0);
      expect(updated.subcategorias).toHaveLength(1);
    });

    it("lanza si la subcategoria ya existe por slug", () => {
      const sub = new Subcategoria({
        slug: "restaurantes",
        nombre: "Restaurantes",
        activo: true,
      });
      const cat = new Categoria({ ...validProps, subcategorias: [sub] });
      const dup = new Subcategoria({
        slug: "restaurantes",
        nombre: "Otra",
        activo: true,
      });
      expect(() => cat.addSubcategoria(dup)).toThrow();
    });
  });

  describe("findSubcategoriaBySlug", () => {
    it("encuentra una subcategoria activa por slug", () => {
      const sub = new Subcategoria({
        slug: "restaurantes",
        nombre: "Restaurantes",
        activo: true,
      });
      const cat = new Categoria({ ...validProps, subcategorias: [sub] });
      const found = cat.findSubcategoriaBySlug("restaurantes", true);
      expect(found).toBeDefined();
      expect(found?.slug).toBe("restaurantes");
    });

    it("devuelve undefined si solo se piden activas y la subcategoría está inactiva", () => {
      const sub = new Subcategoria({
        slug: "restaurantes",
        nombre: "Restaurantes",
        activo: false,
      });
      const cat = new Categoria({ ...validProps, subcategorias: [sub] });
      expect(cat.findSubcategoriaBySlug("restaurantes", true)).toBeUndefined();
      expect(cat.findSubcategoriaBySlug("restaurantes", false)).toBeDefined();
    });
  });
});
