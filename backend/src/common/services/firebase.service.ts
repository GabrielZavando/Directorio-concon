import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth, Auth, DecodedIdToken, UserRecord } from "firebase-admin/auth";
import {
  getFirestore,
  Firestore,
  Timestamp,
  FieldValue,
  DocumentReference,
  CollectionReference,
  Transaction,
  WriteBatch,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
  WhereFilterOp,
} from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firestore: Firestore;
  private auth: Auth;
  private storage: Storage;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const firebaseConfig = this.configService.get("firebase");
    this.enabled = !!firebaseConfig?.enabled;

    if (!this.enabled) {
      this.logger.warn(
        "⚠️ Firebase deshabilitado (FIREBASE_ENABLED != 'true'). El backend corre sin Firebase; los endpoints que lo requieren devolverán 503.",
      );
      return;
    }

    try {
      if (!getApps().length) {
        initializeApp({
          credential: cert(firebaseConfig.serviceAccountKey),
          storageBucket: firebaseConfig.storageBucket,
          databaseURL: firebaseConfig.databaseURL,
        });

        this.logger.log("🔥 Firebase Admin SDK inicializado correctamente");
      } else {
        this.logger.log("🔥 Firebase Admin SDK ya estaba inicializado");
      }

      // Inicializar servicios
      this.firestore = getFirestore();
      this.auth = getAuth();
      this.storage = getStorage();

      // Configurar Firestore
      this.firestore.settings(firebaseConfig.firestoreSettings);

      this.logger.log("✅ Servicios de Firebase configurados");
    } catch (error) {
      this.logger.error("❌ Error al inicializar Firebase:", error);
      throw error;
    }
  }

  /** Indica si Firebase está habilitado e inicializado. */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Lanza 503 si Firebase no está habilitado, para evitar errores crípticos
   * tipo "Cannot read properties of undefined" en endpoints que lo requieren.
   */
  private assertEnabled(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        "Firebase is not enabled. Set FIREBASE_ENABLED=true and provide credentials.",
      );
    }
  }

  // Getters para acceder a los servicios
  getFirestore(): Firestore {
    this.assertEnabled();
    return this.firestore;
  }

  getAuth(): Auth {
    this.assertEnabled();
    return this.auth;
  }

  getStorage(): Storage {
    this.assertEnabled();
    return this.storage;
  }

  // Métodos de utilidad para Firestore

  /**
   * Convierte un timestamp de Firestore a Date
   */
  timestampToDate(timestamp: Timestamp): Date {
    return timestamp?.toDate() || null;
  }

  /**
   * Convierte una Date a timestamp de Firestore
   */
  dateToTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date);
  }

  /**
   * Obtiene el timestamp actual de Firestore
   */
  getCurrentTimestamp(): Timestamp {
    return Timestamp.now();
  }

  /**
   * Obtiene FieldValue para operaciones especiales
   */
  getFieldValue(): typeof FieldValue {
    return FieldValue;
  }

  /**
   * Crea una referencia a un documento
   */
  createDocRef(collection: string, docId?: string): DocumentReference {
    if (docId) {
      return this.firestore.collection(collection).doc(docId);
    }
    return this.firestore.collection(collection).doc();
  }

  /**
   * Crea una referencia a una colección
   */
  createCollectionRef(collection: string): CollectionReference {
    return this.firestore.collection(collection);
  }

  /**
   * Ejecuta una transacción
   */
  async runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    return this.firestore.runTransaction(updateFunction);
  }

  /**
   * Crea un batch para operaciones múltiples
   */
  createBatch(): WriteBatch {
    return this.firestore.batch();
  }

  /**
   * Verifica si un documento existe
   */
  async documentExists(collection: string, docId: string): Promise<boolean> {
    const doc = await this.firestore.collection(collection).doc(docId).get();
    return doc.exists;
  }

  /**
   * Obtiene un documento por ID
   */
  async getDocument(
    collection: string,
    docId: string,
  ): Promise<DocumentSnapshot> {
    return this.firestore.collection(collection).doc(docId).get();
  }

  /**
   * Obtiene documentos de una colección con filtros
   */
  async getDocuments(
    collection: string,
    filters?: Array<{
      field: string;
      operator: WhereFilterOp;
      value: any;
    }>,
    orderBy?: {
      field: string;
      direction: "asc" | "desc";
    },
    limit?: number,
  ): Promise<QuerySnapshot> {
    let query: Query = this.firestore.collection(collection);

    // Aplicar filtros
    if (filters) {
      filters.forEach((filter) => {
        query = query.where(filter.field, filter.operator, filter.value);
      });
    }

    // Aplicar orden
    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction);
    }

    // Aplicar límite
    if (limit) {
      query = query.limit(limit);
    }

    return query.get();
  }

  /**
   * Crea un nuevo documento
   */
  async createDocument(
    collection: string,
    data: any,
    docId?: string,
  ): Promise<DocumentReference> {
    const docRef = docId
      ? this.firestore.collection(collection).doc(docId)
      : this.firestore.collection(collection).doc();

    await docRef.set({
      ...data,
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    });

    return docRef;
  }

  /**
   * Actualiza un documento existente
   */
  async updateDocument(
    collection: string,
    docId: string,
    data: any,
  ): Promise<void> {
    const docRef = this.firestore.collection(collection).doc(docId);
    await docRef.update({
      ...data,
      updatedAt: this.getCurrentTimestamp(),
    });
  }

  /**
   * Elimina un documento
   */
  async deleteDocument(collection: string, docId: string): Promise<void> {
    const docRef = this.firestore.collection(collection).doc(docId);
    await docRef.delete();
  }

  /**
   * Verifica un token de Firebase Auth
   */
  async verifyIdToken(
    idToken: string,
    checkRevoked = true,
  ): Promise<DecodedIdToken> {
    return this.auth.verifyIdToken(idToken, checkRevoked);
  }

  /**
   * Obtiene información de un usuario por UID
   */
  async getUserByUid(uid: string): Promise<UserRecord> {
    return this.auth.getUser(uid);
  }

  /**
   * Obtiene información de un usuario por email
   */
  async getUserByEmail(email: string): Promise<UserRecord> {
    return this.auth.getUserByEmail(email);
  }

  /**
   * Sube un archivo al Storage
   */
  async uploadFile(
    filePath: string,
    buffer: Buffer,
    metadata?: any,
  ): Promise<string> {
    const bucket = this.storage.bucket();
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: metadata,
    });

    // Hacer el archivo público
    await file.makePublic();

    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  }

  /**
   * Elimina un archivo del Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const bucket = this.storage.bucket();
    const file = bucket.file(filePath);
    await file.delete();
  }
}
