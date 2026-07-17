import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ServiceUnavailableException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FirebaseService } from "./firebase.service";

jest.mock("firebase-admin", () => ({
  apps: [] as unknown as admin.app.App[],
  credential: { cert: jest.fn() },
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({ settings: jest.fn() })),
  auth: jest.fn(() => ({})),
  storage: jest.fn(() => ({})),
}));

describe("FirebaseService", () => {
  let firebaseService: FirebaseService;
  let configService: { get: jest.Mock };

  const buildModule = async (configValue: unknown) => {
    configService = { get: jest.fn().mockReturnValue(configValue) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        FirebaseService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    firebaseService = moduleRef.get(FirebaseService);
    await firebaseService.onModuleInit();
  };

  beforeEach(() => {
    (admin.credential.cert as unknown as jest.Mock).mockClear();
    (admin.initializeApp as unknown as jest.Mock).mockClear();
    (admin.firestore as unknown as jest.Mock).mockClear();
    (admin.auth as unknown as jest.Mock).mockClear();
    (admin.storage as unknown as jest.Mock).mockClear();
  });

  describe("when FIREBASE_ENABLED is false", () => {
    beforeEach(async () => {
      await buildModule({
        enabled: false,
        serviceAccountKey: { project_id: "demo" },
      });
    });

    it("should NOT initialize the Firebase app", () => {
      expect(admin.credential.cert).not.toHaveBeenCalled();
      expect(admin.initializeApp).not.toHaveBeenCalled();
    });

    it("isEnabled() should return false", () => {
      expect(firebaseService.isEnabled()).toBe(false);
    });

    it("getFirestore() should throw ServiceUnavailableException (503) when disabled", () => {
      expect(() => firebaseService.getFirestore()).toThrow(
        ServiceUnavailableException,
      );
    });

    it("getAuth() should throw ServiceUnavailableException (503) when disabled", () => {
      expect(() => firebaseService.getAuth()).toThrow(
        ServiceUnavailableException,
      );
    });

    it("getStorage() should throw ServiceUnavailableException (503) when disabled", () => {
      expect(() => firebaseService.getStorage()).toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("when FIREBASE_ENABLED is true", () => {
    beforeEach(async () => {
      await buildModule({
        enabled: true,
        serviceAccountKey: { project_id: "demo" },
        storageBucket: "demo.appspot.com",
        databaseURL: undefined,
        firestoreSettings: {},
      });
    });

    it("should initialize the Firebase app via credential.cert + initializeApp", () => {
      expect(admin.credential.cert).toHaveBeenCalled();
      expect(admin.initializeApp).toHaveBeenCalled();
    });

    it("isEnabled() should return true", () => {
      expect(firebaseService.isEnabled()).toBe(true);
    });

    it("getFirestore() should return a defined firestore instance", () => {
      expect(firebaseService.getFirestore()).toBeDefined();
    });
  });
});
