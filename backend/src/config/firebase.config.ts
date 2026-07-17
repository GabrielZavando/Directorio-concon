import { registerAs } from "@nestjs/config";

export const FirebaseConfig = registerAs("firebase", () => {
  // Firebase is optional. It is only enabled when FIREBASE_ENABLED=true and real
  // credentials are provided. This keeps the bootstrap resilient: the server can
  // start and serve non-Firebase endpoints (e.g. /health) even without a Firebase
  // project configured (common in local dev).
  const enabled = process.env.FIREBASE_ENABLED === "true";

  const firebaseConfig = {
    enabled,

    // Service Account Key (can be a JSON string or built from individual fields)
    serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url:
            "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
        },

    // Storage
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET || "directorio-concon.appspot.com",

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
