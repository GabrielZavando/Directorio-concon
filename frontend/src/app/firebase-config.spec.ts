import { TestBed } from "@angular/core/testing";
import { initializeApp, getApps, deleteApp, FirebaseApp } from "@angular/fire/app";
import { environment } from "../environments/environment";

describe("Firebase config", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it("uses the real directoriconcon project", () => {
    expect(environment.firebase.projectId).toBe("directorioconcon");
    expect(environment.firebase.storageBucket).toBe(
      "directorioconcon.firebasestorage.app",
    );
    expect(environment.firebase.apiKey).toBeTruthy();
  });

  it("initializeApp does not throw with the provided config object", () => {
    let app: FirebaseApp | undefined;
    expect(() => {
      app = initializeApp(environment.firebase);
    }).not.toThrow();
    // Clean up so repeated test runs do not accumulate duplicate apps.
    getApps().forEach((a) => deleteApp(a).catch(() => undefined));
    expect(app).toBeDefined();
  });
});
