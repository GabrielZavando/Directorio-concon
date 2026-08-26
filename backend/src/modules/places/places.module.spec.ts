/**
 * Module-level DI tests for PlacesModule wiring.
 *
 * places-auth-fix (Task 3): `SOLICITUDES_REPOSITORY` must resolve to the real
 * `SolicitudesFirestoreAdapter` exported by `SolicitudesModule` — NOT the
 * legacy `StubSolicitudesRepository` (which returned `{ id: "stub" }` and
 * `existsByPlaceId → false`).
 *
 * No `forwardRef` is needed: `SolicitudesModule` does not import
 * `PlacesModule`, so the module graph has no circular dependency.
 */
import { Test } from "@nestjs/testing";
import { PlacesModule } from "./places.module";
import { PlacesService } from "./application/places.service";
import { FirebaseModule } from "@/common/modules/firebase.module";
import { SOLICITUDES_REPOSITORY } from "./domain/solicitudes-repository.token";
import type { SolicitudesRepositoryInterface } from "./domain/solicitudes-repository.interface";
import { SolicitudesFirestoreAdapter } from "../solicitudes/infrastructure/solicitudes-firestore.adapter";

// Mock the FirebaseService MODULE so `firebase-admin`'s ESM-only deps
// are never loaded by jest (same pattern as places.controller.spec.ts).
jest.mock("@/common/services/firebase.service", () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({})),
}));

describe("PlacesModule (DI wiring)", () => {
  it("resolves SOLICITUDES_REPOSITORY to the real Firestore adapter (not a stub)", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FirebaseModule, PlacesModule],
    }).compile();

    const repo = moduleRef.get(SOLICITUDES_REPOSITORY);

    expect(repo).toBeInstanceOf(SolicitudesFirestoreAdapter);
    expect(typeof (repo as SolicitudesRepositoryInterface).create).toBe(
      "function",
    );
    expect(
      typeof (repo as SolicitudesRepositoryInterface).existsByPlaceId,
    ).toBe("function");

    await moduleRef.close();
  });

  it("resolves PlacesService with the real solicitudes repo injected", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FirebaseModule, PlacesModule],
    }).compile();

    const service = moduleRef.get(PlacesService);
    // The service is constructed with the resolved repo — if the stub were
    // still wired, this test would still pass, but the repo assertion above
    // discriminates. This test guards the service resolution itself.
    expect(service).toBeInstanceOf(PlacesService);

    await moduleRef.close();
  });
});
