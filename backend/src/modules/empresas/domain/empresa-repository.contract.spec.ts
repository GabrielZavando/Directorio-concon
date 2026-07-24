import { EmpresaRepository, CreateEmpresaData } from "./empresa-repository.interface";
import { Empresa } from "./empresa.entity";

/**
 * LSP contract test: validates that ANY EmpresaRepository implementation
 * fulfills the interface contract. Run this against the real Firestore
 * adapter and any future alternative (in-memory for tests, SQL, etc.).
 *
 * The test builds a minimal in-memory implementation and verifies behaviour.
 * When you create EmpresaFirestoreAdapter, import and test it here too.
 */

const NOW = new Date("2026-01-15T10:00:00Z");

function makeEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: "emp-001",
    nombre: "Test Empresa",
    slug: "test-empresa",
    descripcion: "Una empresa de prueba",
    categoriaId: "cat-001",
    barrioId: "bar-001",
    direccion: "Av. Test 123",
    destacado: false,
    verificado: false,
    status: "pendiente",
    planId: "gratuito",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeCreateData(overrides: Partial<CreateEmpresaData> = {}): CreateEmpresaData {
  const empresa = makeEmpresa(overrides);
  const { id, ...rest } = empresa;
  return rest;
}

/**
 * Minimal in-memory implementation used to validate the contract.
 * A real adapter (Firestore) would be tested the same way.
 */
class InMemoryEmpresaRepository implements EmpresaRepository {
  private store = new Map<string, Empresa>();

  async create(data: CreateEmpresaData): Promise<Empresa> {
    const empresa: Empresa = { id: `emp-${this.store.size + 1}`, ...data };
    this.store.set(empresa.id, empresa);
    return empresa;
  }

  async findById(id: string): Promise<Empresa | null> {
    return this.store.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Empresa | null> {
    for (const e of this.store.values()) {
      if (e.slug === slug) return e;
    }
    return null;
  }

  async findAll(): Promise<{ data: Empresa[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const data = Array.from(this.store.values());
    return { data, meta: { total: data.length, page: 1, limit: 10, totalPages: 1 } };
  }

  async update(id: string, data: Partial<CreateEmpresaData>): Promise<Empresa> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Empresa ${id} not found`);
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.store.has(id)) throw new Error(`Empresa ${id} not found`);
    this.store.delete(id);
  }

  async slugExists(slug: string): Promise<boolean> {
    for (const e of this.store.values()) {
      if (e.slug === slug) return true;
    }
    return false;
  }
}

describe("EmpresaRepository — LSP contract", () => {
  let repo: EmpresaRepository;

  beforeEach(() => {
    repo = new InMemoryEmpresaRepository();
  });

  it("create → returns empresa with generated id", async () => {
    const data = makeCreateData({ slug: "mi-empresa" });
    const result = await repo.create(data);

    expect(result.id).toBeDefined();
    expect(result.slug).toBe("mi-empresa");
    expect(result.status).toBe("pendiente");
  });

  it("findById → returns empresa or null", async () => {
    const created = await repo.create(makeCreateData());
    const found = await repo.findById(created.id);
    const missing = await repo.findById("nonexistent");

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(missing).toBeNull();
  });

  it("findBySlug → returns empresa or null", async () => {
    await repo.create(makeCreateData({ slug: "slug-unique" }));
    const found = await repo.findBySlug("slug-unique");
    const missing = await repo.findBySlug("no-existe");

    expect(found).not.toBeNull();
    expect(found!.slug).toBe("slug-unique");
    expect(missing).toBeNull();
  });

  it("findAll → returns paginated result", async () => {
    await repo.create(makeCreateData({ slug: "e1" }));
    await repo.create(makeCreateData({ slug: "e2" }));
    const result = await repo.findAll({}, 1, 10);

    expect(result.data.length).toBe(2);
    expect(result.meta.total).toBe(2);
  });

  it("update → merges partial data", async () => {
    const created = await repo.create(makeCreateData({ nombre: "Old Name" }));
    const updated = await repo.update(created.id, { nombre: "New Name" });

    expect(updated.nombre).toBe("New Name");
    expect(updated.slug).toBe(created.slug); // unchanged
  });

  it("delete → removes empresa", async () => {
    const created = await repo.create(makeCreateData());
    await repo.delete(created.id);
    const found = await repo.findById(created.id);

    expect(found).toBeNull();
  });

  it("slugExists → true/false correctly", async () => {
    await repo.create(makeCreateData({ slug: "exists" }));

    expect(await repo.slugExists("exists")).toBe(true);
    expect(await repo.slugExists("nope")).toBe(false);
  });
});
