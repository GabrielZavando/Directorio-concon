import { registerAs } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

/**
 * Build a service-account credential from individual FIREBASE_* env vars.
 * Returns `undefined` when the required env vars are absent so the caller can
 * treat "no credentials" as disabled (instead of constructing an empty object).
 */
function buildEnvServiceAccount(): Record<string, unknown> | undefined {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  }
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
    };
  }
  return undefined;
}

/**
 * Resolve the Firebase Admin service-account credential.
 * Precedence:
 *   1. FIREBASE_ADMIN_CREDENTIALS_PATH (absolute or cwd-relative)
 *   2. firebase-admin.json at the repo root (probed from several cwd layouts)
 *   3. FIREBASE_* environment variables (Docker/CI without the file)
 */
function resolveServiceAccount(): {
  serviceAccountKey?: Record<string, unknown>;
} {
  const candidates: string[] = [];

  const explicitPath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH;
  if (explicitPath) {
    candidates.push(path.resolve(explicitPath));
  }
  candidates.push(
    path.resolve(process.cwd(), "firebase-admin.json"),
    path.resolve(process.cwd(), "..", "firebase-admin.json"),
    path.resolve(__dirname, "..", "..", "..", "firebase-admin.json"),
  );

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, "utf8");
        return { serviceAccountKey: JSON.parse(raw) };
      }
    } catch {
      // Unreadable candidate — keep probing the next one.
    }
  }

  const envCreds = buildEnvServiceAccount();
  if (envCreds) {
    return { serviceAccountKey: envCreds };
  }

  return {};
}

export const FirebaseConfig = registerAs("firebase", () => {
  const resolved = resolveServiceAccount();
  // Firebase service-account credentials are provided by GCP; we don't own their
  // shape, hence `any` here (it is passed verbatim to admin.credential.cert).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceAccountKey: any = resolved.serviceAccountKey;
  const credentialsResolved = !!serviceAccountKey;

  // Firebase is optional. It is enabled only when credentials are resolvable and
  // the operator has not explicitly disabled it (FIREBASE_ENABLED !== 'false').
  // When FIREBASE_ENABLED=true but no credential can be resolved, the server still
  // boots (resilient) and Firestore endpoints return 503.
  const enabled =
    process.env.FIREBASE_ENABLED !== "false" && credentialsResolved;

  const projectId =
    (serviceAccountKey?.project_id as string | undefined) ||
    process.env.FIREBASE_PROJECT_ID;

  const firebaseConfig = {
    enabled,
    serviceAccountKey,

    // Storage
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      (projectId
        ? `${projectId}.firebasestorage.app`
        : "directorio-concon.appspot.com"),

    // Firestore
    databaseURL: process.env.FIREBASE_DATABASE_URL,

    // Firestore settings (consumed by FirebaseService after the app is initialized)
    firestoreSettings: {
      ignoreUndefinedProperties: true, // Ignorar propiedades undefined
      timestampsInSnapshots: true, // Usar timestamps nativos
    },

    // Storage settings
    storageSettings: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "application/pdf",
      ],
    },

    // Authentication settings
    authSettings: {
      verifyIdTokens: true, // Verificar tokens de ID
      checkRevoked: true, // Verificar si el token fue revocado
      clockTolerance: 60, // Tolerancia de tiempo en segundos
    },
  };

  // NOTE: the Firebase Admin app is NOT initialized here. FirebaseService does it
  // lazily on module init, only when `enabled` is true. This avoids calling
  // admin.firestore()/auth()/storage() (which require an initialized app) at config
  // load time and prevents the bootstrap from crashing when Firebase is disabled.
  return firebaseConfig;
});
