/**
 * LSP contract test for UsuariosRepositoryInterface.
 *
 * Validates that any concrete implementation of the interface satisfies the
 * contract (method signatures, return types, smoke runtime calls). Mirrors
 * the pattern of evento-repository.contract.spec.ts.
 *
 * The interface is split into read + write segregated interfaces (ISP ≤ 5
 * methods each) and a combined UsuariosRepositoryInterface for the service.
 *
 * Pure domain: no firebase-admin, no class-validator, no @nestjs/* imports.
 */
import type {
  UsuarioReadRepositoryInterface,
  UsuarioWriteRepositoryInterface,
  UsuarioRepositoryInterface,
  PaginatedUsuarios,
  UsuarioSearchFilters,
} from "./usuario-repository.interface";
import type { Usuario } from "./usuario.entity";

// ---------------------------------------------------------------------------
// Dummy implementation — satisfies the combined interface for compile-time
// checks and provides a no-throw/throw surface for runtime smoke calls.
// ---------------------------------------------------------------------------
class DummyUsuarioRepository implements UsuarioRepositoryInterface {
  async findById(_uid: string): Promise<Usuario | null> {
    return null;
  }

  async findByEmail(_email: string): Promise<Usuario | null> {
    return null;
  }

  async findAll(_filters: UsuarioSearchFilters): Promise<PaginatedUsuarios> {
    return { data: [], total: 0 };
  }

  async create(
    _usuario: Omit<Usuario, "createdAt" | "updatedAt">,
  ): Promise<Usuario> {
    throw new Error("Not implemented");
  }

  async updatePerfil(
    _uid: string,
    _patch: Pick<Usuario, "nombre" | "telefono">,
  ): Promise<Usuario> {
    throw new Error("Not implemented");
  }

  async updateRol(_uid: string, _rol: Usuario["rol"]): Promise<Usuario> {
    throw new Error("Not implemented");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCreateInput(
  overrides: Partial<Omit<Usuario, "createdAt" | "updatedAt">> = {},
): Omit<Usuario, "createdAt" | "updatedAt"> {
  return {
    id: "uid-owner-001",
    email: "owner@example.com",
    nombre: "Owner One",
    rol: "owner",
    telefono: "+56912345678",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Contract tests
// ---------------------------------------------------------------------------
describe("UsuariosRepositoryInterface (LSP contract)", () => {
  let repo: UsuarioRepositoryInterface;

  beforeEach(() => {
    repo = new DummyUsuarioRepository();
  });

  // Read methods
  it("findById returns Usuario or null", async () => {
    const result = await repo.findById("uid-x");
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("findByEmail returns Usuario or null", async () => {
    const result = await repo.findByEmail("x@example.com");
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("findAll returns PaginatedUsuarios with data array + total", async () => {
    const result = await repo.findAll({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  // Write methods
  it("create throws when the dummy is not implemented (signature compiles)", async () => {
    await expect(repo.create(makeCreateInput())).rejects.toThrow(
      "Not implemented",
    );
  });

  it("updatePerfil throws when the dummy is not implemented (signature compiles)", async () => {
    await expect(
      repo.updatePerfil("uid-x", { nombre: "New", telefono: "+5691" }),
    ).rejects.toThrow("Not implemented");
  });

  it("updateRol throws when the dummy is not implemented (signature compiles)", async () => {
    await expect(repo.updateRol("uid-x", "member")).rejects.toThrow(
      "Not implemented",
    );
  });

  // Interface segregation (read/write split)
  describe("interface segregation (read/write split)", () => {
    it("UsuarioReadRepositoryInterface exposes read methods only", () => {
      const read: UsuarioReadRepositoryInterface = repo;
      // Compile-time: read has ONLY findById/findByEmail/findAll
      expect(typeof read.findById).toBe("function");
      expect(typeof read.findByEmail).toBe("function");
      expect(typeof read.findAll).toBe("function");
    });

    it("UsuarioWriteRepositoryInterface exposes write methods only", () => {
      const write: UsuarioWriteRepositoryInterface = repo;
      expect(typeof write.create).toBe("function");
      expect(typeof write.updatePerfil).toBe("function");
      expect(typeof write.updateRol).toBe("function");
    });

    it("combined interface is assignable from read + write (LSP)", () => {
      // If the combined interface drifts from extends read + write, this
      // assignment fails to compile.
      const _combined: UsuarioRepositoryInterface =
        new DummyUsuarioRepository();
      void _combined;
      expect(true).toBe(true);
    });
  });

  // PaginatedUsuarios shape contract — keeps the type stable across refactors
  describe("PaginatedUsuarios shape", () => {
    it("exposes data array + total number", async () => {
      const result = await repo.findAll({});
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("optionally supports nextCursor for cursor-based pagination", () => {
      const sample: PaginatedUsuarios = { data: [], total: 0 };
      // nextCursor is optional — undefined is allowed
      expect(sample.nextCursor).toBeUndefined();
    });
  });
});
