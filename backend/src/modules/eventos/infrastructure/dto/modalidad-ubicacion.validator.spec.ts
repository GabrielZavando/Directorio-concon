/**
 * Unit tests for the ModalidadUbicacionConstraint cross-field validator.
 */
import { ModalidadUbicacionConstraint } from "./modalidad-ubicacion.validator";

interface Sample {
  modalidad?: string;
  ubicacion?: unknown;
}

describe("ModalidadUbicacionConstraint", () => {
  const constraint = new ModalidadUbicacionConstraint();

  const args = (obj: Sample) =>
    ({ object: obj }) as unknown as Parameters<
      ModalidadUbicacionConstraint["validate"]
    >[1];

  it("passes when modalidad is omitted (partial update)", () => {
    expect(
      constraint.validate(undefined, args({ organizador: "x" } as Sample)),
    ).toBe(true);
  });

  it("rejects online evento that includes ubicacion", () => {
    const obj: Sample = {
      modalidad: "online",
      ubicacion: { coordenadas: { lat: 1, lng: 2 } },
    };
    expect(constraint.validate(undefined, args(obj))).toBe(false);
    expect(constraint.defaultMessage(args(obj))).toContain(
      "online events must not include ubicacion",
    );
  });

  it("passes online evento without ubicacion", () => {
    const obj: Sample = { modalidad: "online" };
    expect(constraint.validate(undefined, args(obj))).toBe(true);
  });

  it("rejects presencial evento without ubicacion", () => {
    const obj: Sample = { modalidad: "presencial" };
    expect(constraint.validate(undefined, args(obj))).toBe(false);
    expect(constraint.defaultMessage(args(obj))).toContain(
      "ubicacion is required when modalidad",
    );
  });

  it("passes presencial evento with ubicacion", () => {
    const obj: Sample = {
      modalidad: "presencial",
      ubicacion: { coordenadas: { lat: 1, lng: 2 } },
    };
    expect(constraint.validate(undefined, args(obj))).toBe(true);
  });

  it("passes hibrido evento with ubicacion", () => {
    const obj: Sample = {
      modalidad: "hibrido",
      ubicacion: { coordenadas: { lat: 1, lng: 2 } },
    };
    expect(constraint.validate(undefined, args(obj))).toBe(true);
  });
});
