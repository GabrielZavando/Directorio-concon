/**
 * Seed script — creates the first admin user in Firebase Auth + Firestore.
 *
 * Usage (against Firebase real):
 *   npm run seed:admin -- --email=admin@example.com --password=Secret123 --nombre=Administrador Global
 *
 * Idempotent by email: if a Firebase Auth user already exists with the given
 * email, the script only updates the `usuarios` document to `rol: 'admin'`
 * instead of trying to create a duplicate Auth user (which would throw).
 *
 * The first admin MUST be created this way, since the public self-registration
 * endpoint `POST /api/v1/auth/registro` only accepts `rol ∈ {member, owner}`.
 *
 * Exit codes: 0 success, 1 failure.
 *
 * Note: this script runs against **Firebase real** (not the Emulator), using
 * the project's `firebase-admin.json` credentials. It is intended for initial
 * project setup or adding a new super-admin. For dev workflow, the Emulator
 * can be used with a corresponding test script (out of scope for MVP).
 *
 * References:
 *  - `backend/scripts/lib/bootstrap-firebase.ts` — shared bootstrap logic.
 *  - `docs/deploy-standards.md` §"Firebase Auth config" — required Console
 *    setup (Email/Password + Google providers).
 *  - Change `auth-usuarios-v2` (CH-02): self-registration público + seed-admin.
 */
import * as dotenv from "dotenv";
import { ConfigService } from "@nestjs/config";
import { bootstrapFirebase } from "./lib/bootstrap-firebase";

// Load .env first (scripts usually run from repo root)
dotenv.config();

interface SeedAdminOptions {
  email: string;
  password: string;
  nombre: string;
}

/**
 * Parse CLI flags: --email, --password, --nombre
 */
function parseArgs(): SeedAdminOptions {
  const args = process.argv.slice(2);
  const opts: Partial<SeedAdminOptions> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && i + 1 < args.length) {
      opts.email = args[++i];
    } else if (args[i] === "--password" && i + 1 < args.length) {
      opts.password = args[++i];
    } else if (args[i] === "--nombre" && i + 1 < args.length) {
      opts.nombre = args[++i];
    }
  }

  if (!opts.email || !opts.password || !opts.nombre) {
    console.error(
      "Usage: npm run seed:admin -- --email=ADMIN_EMAIL --password=ADMIN_PASSWORD --nombre=ADMIN_NAME",
    );
    process.exit(1);
  }

  return opts as SeedAdminOptions;
}

async function main(): Promise<void> {
  const opts = parseArgs();

  // Bootstrap Firebase (real project, not Emulator) via shared lib
  const firebase = await bootstrapFirebase();

  if (!firebase.isEnabled()) {
    throw new Error(
      "Firebase is not enabled. Check FIREBASE_ENABLED and credentials.",
    );
  }

  const adminAuth = firebase.getAuth();
  const adminFirestore = firebase.getFirestore();

  // 1. Check if a user with this email already exists in Firebase Auth
  let userRecord: any;
  try {
    userRecord = await adminAuth.getUserByEmail(opts.email);
    console.log(
      `✅ Firebase Auth user already exists with email ${opts.email} (uid: ${userRecord.uid})`,
    );
  } catch (err: any) {
    // user not found — create new
    if (err.code === "auth/user-not-found") {
      console.log(`🔹 Creating new Firebase Auth user for ${opts.email}...`);
      userRecord = await adminAuth.createUser({ email: opts.email, password: opts.password, displayName: opts.nombre });
      console.log(`   Created uid: ${userRecord.uid}`);
    } else {
      console.error("❌ Firebase Auth error:", err);
      process.exit(1);
      return;
    }
  }

  // 2. Write/create the usuarios document with rol: 'admin'
  const usersCollection = adminFirestore.collection("usuarios");
  const uid = userRecord.uid;

  // Idempotent: set the doc, merging any existing fields
  await usersCollection.doc(uid).set({
    uid,
    email: opts.email,
    nombre: opts.nombre,
    rol: "admin",
  }, { merge: true });

  console.log(
    `✅ Admin user ensured: uid=${uid}, email=${opts.email}, rol=admin`,
  );
  console.log(
    `   The public endpoint POST /api/v1/auth/registro now accepts ` +
      `'rol': "member" | "owner"' for new users` +
      `\n   The first admin was provisioned via this script.`,
  );

  // No need to close — process exits soon
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ seed-admin failed:", error);
    process.exit(1);
  });