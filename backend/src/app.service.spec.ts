import { AppService } from "./app.service";
import { ConfigService } from "@nestjs/config";

describe("AppService", () => {
  let service: AppService;
  let configService: { get: jest.Mock };

  const build = (firebaseEnabled: boolean) => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === "firebase.enabled") return firebaseEnabled;
        return undefined;
      }),
    };
    service = new AppService(configService as unknown as ConfigService);
  };

  it("getHealthStatus reports firebase 'disabled' when FIREBASE_ENABLED is false", () => {
    build(false);
    const status = service.getHealthStatus();
    expect(status.services.firebase).toBe("disabled");
  });

  it("getHealthStatus reports firebase 'connected' when FIREBASE_ENABLED is true", () => {
    build(true);
    const status = service.getHealthStatus();
    expect(status.services.firebase).toBe("connected");
  });
});
