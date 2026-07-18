import { FirebaseConfig } from "./firebase.config";
import * as fs from "fs";

// Mock the filesystem so the test is deterministic and never touches the real
// firebase-admin.json on disk.
jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

const SAMPLE_FILE = JSON.stringify({
  type: "service_account",
  project_id: "directorioconcon",
  private_key: "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk@directorioconcon.iam.gserviceaccount.com",
});

describe("FirebaseConfig - credential resolution from firebase-admin.json", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    mockedFs.existsSync.mockReset();
    mockedFs.readFileSync.mockReset();
    // Default: no credentials file anywhere, no env creds.
    mockedFs.existsSync.mockReturnValue(false);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  const clearFirebaseEnv = () => {
    delete process.env.FIREBASE_ENABLED;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_PRIVATE_KEY_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_CLIENT_ID;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    delete process.env.FIREBASE_ADMIN_CREDENTIALS_PATH;
  };

  it("auto-enables when firebase-admin.json is present and FIREBASE_ENABLED is unset", () => {
    clearFirebaseEnv();
    mockedFs.existsSync.mockImplementation((p) =>
      String(p).includes("firebase-admin.json"),
    );
    mockedFs.readFileSync.mockReturnValue(SAMPLE_FILE);

    const config = FirebaseConfig();

    expect(config.enabled).toBe(true);
    expect(config.serviceAccountKey).toEqual(JSON.parse(SAMPLE_FILE));
    // storageBucket must be derived from the file's project_id
    expect(config.storageBucket).toContain("directorioconcon");
  });

  it("disables and yields no serviceAccountKey when no file and no env creds", () => {
    clearFirebaseEnv();
    mockedFs.existsSync.mockReturnValue(false);

    const config = FirebaseConfig();

    expect(config.enabled).toBe(false);
    expect(config.serviceAccountKey).toBeUndefined();
  });

  it("disables when FIREBASE_ENABLED=false even if the file is present", () => {
    clearFirebaseEnv();
    process.env.FIREBASE_ENABLED = "false";
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(SAMPLE_FILE);

    const config = FirebaseConfig();

    expect(config.enabled).toBe(false);
  });

  it("file takes precedence over FIREBASE_* env vars", () => {
    clearFirebaseEnv();
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(SAMPLE_FILE);
    // Env vars are also set, but the file must win.
    process.env.FIREBASE_PROJECT_ID = "env-project";
    process.env.FIREBASE_PRIVATE_KEY = "env-key";

    const config = FirebaseConfig();

    expect(config.serviceAccountKey).toBeDefined();
    expect(
      (config.serviceAccountKey as { project_id: string }).project_id,
    ).toBe("directorioconcon");
  });

  it("falls back to env vars (enabled) when no file but env creds present", () => {
    clearFirebaseEnv();
    mockedFs.existsSync.mockReturnValue(false);
    process.env.FIREBASE_PROJECT_ID = "env-project";
    process.env.FIREBASE_PRIVATE_KEY = "env-key";

    const config = FirebaseConfig();

    expect(config.enabled).toBe(true);
    expect(
      (config.serviceAccountKey as { project_id: string }).project_id,
    ).toBe("env-project");
  });

  it("stays disabled when FIREBASE_ENABLED=true but no credential resolves (resilient boot)", () => {
    clearFirebaseEnv();
    process.env.FIREBASE_ENABLED = "true";
    mockedFs.existsSync.mockReturnValue(false);

    const config = FirebaseConfig();

    expect(config.enabled).toBe(false);
    expect(config.serviceAccountKey).toBeUndefined();
  });
});
