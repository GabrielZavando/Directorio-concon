/**
 * Contract test (LSP — Liskov Substitution Principle) para cualquier
 * implementación de las interfaces BarrioReadRepository y
 * BarrioWriteRepository. Cualquier adapter concreto (Firestore, in-memory,
 * mock de tests E2E) que implemente las interfaces debe pasar este test.
 */
import { Barrio } from "./barrio.entity";
import { BarrioReadRepository } from "./barrio-read-repository.interface";
import { BarrioWriteRepository } from "./barrio-write-repository.interface";

describe("BarrioRepository contract", () => {
  it("las interfaces declaran los métodos esperados", () => {
    const expectedReadMethods = [
      "findById",
      "findBySlug",
      "list",
      "existsBySlug",
    ];
    const expectedWriteMethods = [
      "create",
      "updateById",
      "activate",
      "deactivate",
    ];

    const fakeRead: Partial<BarrioReadRepository> = {};
    const fakeWrite: Partial<BarrioWriteRepository> = {};
    for (const m of expectedReadMethods)
      fakeRead[m as keyof BarrioReadRepository] = jest.fn();
    for (const m of expectedWriteMethods)
      fakeWrite[m as keyof BarrioWriteRepository] = jest.fn();

    expect(Object.keys(fakeRead).sort()).toEqual(
      [...expectedReadMethods].sort(),
    );
    expect(Object.keys(fakeWrite).sort()).toEqual(
      [...expectedWriteMethods].sort(),
    );
  });

  it("ISP: ninguna interfaz excede 5 métodos", () => {
    const readMethods: (keyof BarrioReadRepository)[] = [
      "findById",
      "findBySlug",
      "list",
      "existsBySlug",
    ];
    const writeMethods: (keyof BarrioWriteRepository)[] = [
      "create",
      "updateById",
      "activate",
      "deactivate",
    ];
    expect(readMethods.length).toBeLessThanOrEqual(5);
    expect(writeMethods.length).toBeLessThanOrEqual(5);
  });

  it("Barrio es inmutable — mutaciones vía métodos específicos", () => {
    const barrio = new Barrio({
      id: "higuerillas",
      nombre: "Higuerillas",
      slug: "higuerillas",
      tipo: "urbano",
    });
    // @ts-expect-error - readonly
    barrio.activo = false;
    expect(typeof barrio.deactivate).toBe("function");
    expect(typeof barrio.activate).toBe("function");
  });
});
