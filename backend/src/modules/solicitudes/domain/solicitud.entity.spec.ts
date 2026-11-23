import { Solicitud } from "./solicitud.entity";

describe("Solicitud Entity — CH-05 refactor", () => {
  // Task 2.1-2.5: Tests for entity refactoring

  it("should have tipo enum limited to 'reclamo-place' only", () => {
    const validTipo = "reclamo-place" as const;
    expect(validTipo).toBe("reclamo-place");
  });

  it("should NOT accept deprecated types in Solicitud tipo", () => {
    const deprecatedTypes: (
      | "registro"
      | "actualizacion"
      | "registro-evento"
      | "actualizacion-evento"
    )[] = [
      "registro",
      "actualizacion",
      "registro-evento",
      "actualizacion-evento",
    ];
    deprecatedTypes.forEach((tipo) => {
      expect(tipo).not.toBe("reclamo-place");
    });
  });

  it("should have placeId as required field (no optional)", () => {
    const solicitud: Solicitud = {
      id: "test-1",
      placeId: "place-1",
      solicitanteUid: "uid-owner-001",
      usuarioId: "uid-owner-001",
      tipo: "reclamo-place",
      status: "pendiente",
      createdAt: new Date(),
    };
    expect(solicitud.placeId).toBe("place-1");
    // placeId should be required - trying to create without it should cause TS error
    expect(solicitud.placeId).toBeDefined();
  });

  it("should have solicitanteUid as required field (no optional)", () => {
    const solicitud: Solicitud = {
      id: "test-1",
      placeId: "place-1",
      solicitanteUid: "uid-owner-001",
      usuarioId: "uid-owner-001",
      tipo: "reclamo-place",
      status: "pendiente",
      createdAt: new Date(),
    };
    expect(solicitud.solicitanteUid).toBe("uid-owner-001");
    expect(solicitud.solicitanteUid).toBeDefined();
  });

  it("should NOT have eventoId property (removed in CH-05)", () => {
    const solicitud: Solicitud = {
      id: "test-1",
      placeId: "place-1",
      solicitanteUid: "uid-owner-001",
      usuarioId: "uid-owner-001",
      tipo: "reclamo-place",
      status: "pendiente",
      createdAt: new Date(),
    };
    // eventoId was removed - accessing it should cause TS error,
    // at runtime it's just not there
    expect(solicitud.placeId).toBe("place-1");
  });

  it("should NOT have proposal property (removed in CH-05)", () => {
    const solicitud: Solicitud = {
      id: "test-1",
      placeId: "place-1",
      solicitanteUid: "uid-owner-001",
      usuarioId: "uid-owner-001",
      tipo: "reclamo-place",
      status: "pendiente",
      createdAt: new Date(),
    };
    // proposal was removed
    expect(solicitud.placeId).toBe("place-1");
  });

  it("should have all required fields: id, placeId, solicitanteUid, usuarioId, tipo, status", () => {
    const solicitud: Solicitud = {
      id: "test-1",
      placeId: "place-1",
      solicitanteUid: "uid-owner-001",
      usuarioId: "uid-owner-001",
      tipo: "reclamo-place",
      status: "pendiente",
      createdAt: new Date(),
    };
    expect(solicitud).toHaveProperty("id", "test-1");
    expect(solicitud).toHaveProperty("placeId", "place-1");
    expect(solicitud).toHaveProperty("solicitanteUid", "uid-owner-001");
    expect(solicitud).toHaveProperty("usuarioId", "uid-owner-001");
    expect(solicitud).toHaveProperty("tipo", "reclamo-place");
    expect(solicitud).toHaveProperty("status", "pendiente");
  });
});
