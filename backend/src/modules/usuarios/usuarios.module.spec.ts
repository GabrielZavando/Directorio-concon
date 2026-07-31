/**
 * UsuariosModule wiring smoke test.
 *
 * Task 14.2 requires ≥ 90% coverage on `modules/usuarios/**`. The module
 * factory file (`usuarios.module.ts`) is only executed when the module is
 * imported by a spec (the AppModule e2e boot covers it, but the unit
 * coverage run does not load AppModule). This minimal spec imports the
 * real module so the wiring file is exercised and its DI graph proven.
 */
import { Test } from "@nestjs/testing";
import { UsuariosModule } from "./usuarios.module";
import { FirebaseModule } from "@/common/modules/firebase.module";

// Mock the FirebaseService MODULE so `firebase-admin`'s ESM-only deps
// are never loaded by jest.
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

describe("UsuariosModule", () => {
  it("compiles and wires the module graph", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FirebaseModule, UsuariosModule],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
