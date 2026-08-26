import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { FirebaseService } from "./firebase.service";

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApps: jest.fn(() => []),
}));
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({ settings: jest.fn() })),
  Timestamp: { fromDate: jest.fn(), now: jest.fn() },
  FieldValue: { serverTimestamp: jest.fn() },
}));
jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({})),
}));
jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => ({})),
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
    (cert as unknown as jest.Mock).mockClear();
    (initializeApp as unknown as jest.Mock).mockClear();
    (getFirestore as unknown as jest.Mock).mockClear();
    (getAuth as unknown as jest.Mock).mockClear();
    (getStorage as unknown as jest.Mock).mockClear();
  });

  describe("when FIREBASE_ENABLED is false", () => {
    beforeEach(async () => {
      jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      await buildModule({
        enabled: false,
        serviceAccountKey: { project_id: "demo" },
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should NOT initialize the Firebase app", () => {
      expect(cert).not.toHaveBeenCalled();
      expect(initializeApp).not.toHaveBeenCalled();
    });

    it("isEnabled() should return false", () => {
      expect(firebaseService.isEnabled()).toBe(false);
    });

    it("logs a warning and does NOT crash on a resilient disabled boot", () => {
      expect(Logger.prototype.warn).toHaveBeenCalled();
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

    it("should initialize the Firebase app via cert + initializeApp", () => {
      expect(cert).toHaveBeenCalled();
      expect(initializeApp).toHaveBeenCalled();
    });

    it("isEnabled() should return true", () => {
      expect(firebaseService.isEnabled()).toBe(true);
    });

    it("getFirestore() should return a defined firestore instance", () => {
      expect(firebaseService.getFirestore()).toBeDefined();
    });

    it("fails fast (throws) when Firebase initialization fails with an invalid credential", async () => {
      (initializeApp as unknown as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid PEM formatted message");
      });
      await expect(firebaseService.onModuleInit()).rejects.toThrow(
        /Invalid PEM/,
      );
    });
  });
});
