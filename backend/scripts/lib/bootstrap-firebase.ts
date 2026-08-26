/**
 * Firebase bootstrap for operational scripts (seed, audit-refs).
 *
 * Bootstraps FirebaseService WITHOUT the Nest application container:
 * constructs a ConfigService with the `firebase` namespace registered and
 * calls `onModuleInit()` manually. Scripts that need Firestore should call
 * `bootstrapFirebase()` and reuse the returned FirebaseService.
 *
 * Idempotent: the initialized instance is cached at module level, so
 * calling `bootstrapFirebase()` several times in one process (e.g. seed.ts
 * seeding categorias then barrios) reuses the same FirebaseService instead
 * of re-initializing Firestore (its `settings()` can only be called once).
 *
 * Requires a resolvable service account (firebase-admin.json at repo root,
 * FIREBASE_ADMIN_CREDENTIALS_PATH, or FIREBASE_* env vars) and
 * `FIREBASE_ENABLED=true` in `backend/.env`. For the local emulator set
 * `FIRESTORE_EMULATOR_HOST=localhost:8080` (Admin SDK connects automatically).
 */
import "dotenv/config";
import { ConfigService } from "@nestjs/config";
import { FirebaseService } from "../../src/common/services/firebase.service";
import { FirebaseConfig } from "../../src/config/firebase.config";

/** Cached initialized instance, reused across calls in the same process. */
let cachedFirebase: FirebaseService | undefined;

/**
 * Instantiates and initializes FirebaseService without Nest.
 * The first call performs the initialization; subsequent calls return the
 * cached instance.
 * @throws Error when Firebase is disabled or credentials are missing.
 */
export async function bootstrapFirebase(): Promise<FirebaseService> {
  if (cachedFirebase) {
    return cachedFirebase;
  }

  const configService = new ConfigService({ firebase: FirebaseConfig() });
  const firebase = new FirebaseService(configService);
  await firebase.onModuleInit();

  if (!firebase.isEnabled()) {
    throw new Error(
      "Firebase is not enabled. Set FIREBASE_ENABLED=true and provide " +
        "credentials (firebase-admin.json or FIREBASE_* env vars).",
    );
  }

  cachedFirebase = firebase;
  return firebase;
}
