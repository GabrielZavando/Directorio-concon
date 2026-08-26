import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { assertFound, assertOwnerOrAdmin } from "./assertions";

describe("assertFound", () => {
  it("returns the resource unchanged when it is present", () => {
    const resource = { id: "p1", name: "Place" };
    expect(assertFound(resource, "Place", "p1")).toBe(resource);
  });

  it("throws NotFoundException with the unified message when resource is null", () => {
    let caught: unknown;
    try {
      assertFound(null, "Evento", "e9");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(NotFoundException);
    expect((caught as NotFoundException).message).toBe(
      "Evento e9 no encontrado",
    );
  });

  it("throws NotFoundException with the unified message when resource is undefined", () => {
    let caught: unknown;
    try {
      assertFound(undefined, "Place", "p7");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(NotFoundException);
    expect((caught as NotFoundException).message).toBe(
      "Place p7 no encontrado",
    );
  });
});

describe("assertOwnerOrAdmin", () => {
  it("does not throw when the actor is the resource owner", () => {
    expect(() =>
      assertOwnerOrAdmin({ uid: "u1", rol: "owner" }, "u1", "modificar"),
    ).not.toThrow();
  });

  it("does not throw when the actor has the admin rol", () => {
    expect(() =>
      assertOwnerOrAdmin({ uid: "admin1", rol: "admin" }, "owner2", "eliminar"),
    ).not.toThrow();
  });

  it("throws ForbiddenException when the actor is neither owner nor admin", () => {
    let caught: unknown;
    try {
      assertOwnerOrAdmin(
        { uid: "u3", rol: "owner" },
        "u9",
        "modificar este lugar",
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ForbiddenException);
    expect((caught as ForbiddenException).message).toBe(
      "No tienes permiso para modificar este lugar",
    );
  });
});
