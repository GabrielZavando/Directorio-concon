import { registerAs } from "@nestjs/config";
import * as admin from "firebase-admin";

export const FirebaseConfig = registerAs("firebase", () => {
  // Configuración de Firebase Admin SDK
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || "directorio-concon",

    // Service Account Key (puede ser JSON string o archivo)
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

    // Configuración de Storage
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET || "directorio-concon.appspot.com",

    // Configuración de Firestore
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  };

  // Inicializar Firebase Admin si no está ya inicializado
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig.serviceAccountKey),
      storageBucket: firebaseConfig.storageBucket,
      databaseURL: firebaseConfig.databaseURL,
    });
  }

  return {
    ...firebaseConfig,

    // Instancias de servicios
    firestore: admin.firestore(),
    auth: admin.auth(),
    storage: admin.storage(),

    // Configuraciones específicas de Firestore
    firestoreSettings: {
      ignoreUndefinedProperties: true, // Ignorar propiedades undefined
      timestampsInSnapshots: true, // Usar timestamps nativos
    },

    // Configuraciones de Storage
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

    // Configuraciones de Authentication
    authSettings: {
      verifyIdTokens: true, // Verificar tokens de ID
      checkRevoked: true, // Verificar si el token fue revocado
      clockTolerance: 60, // Tolerancia de tiempo en segundos
    },
  };
});
