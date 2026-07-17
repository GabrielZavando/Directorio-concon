import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firestore: admin.firestore.Firestore;
  private auth: admin.auth.Auth;
  private storage: admin.storage.Storage;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      const firebaseConfig = this.configService.get('firebase');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(firebaseConfig.serviceAccountKey),
          storageBucket: firebaseConfig.storageBucket,
          databaseURL: firebaseConfig.databaseURL,
        });
        
        this.logger.log('🔥 Firebase Admin SDK inicializado correctamente');
      } else {
        this.logger.log('🔥 Firebase Admin SDK ya estaba inicializado');
      }

      // Inicializar servicios
      this.firestore = admin.firestore();
      this.auth = admin.auth();
      this.storage = admin.storage();

      // Configurar Firestore
      this.firestore.settings(firebaseConfig.firestoreSettings);

      this.logger.log('✅ Servicios de Firebase configurados');
    } catch (error) {
      this.logger.error('❌ Error al inicializar Firebase:', error);
      throw error;
    }
  }

  // Getters para acceder a los servicios
  getFirestore(): admin.firestore.Firestore {
    return this.firestore;
  }

  getAuth(): admin.auth.Auth {
    return this.auth;
  }

  getStorage(): admin.storage.Storage {
    return this.storage;
  }

  // Métodos de utilidad para Firestore
  
  /**
   * Convierte un timestamp de Firestore a Date
   */
  timestampToDate(timestamp: admin.firestore.Timestamp): Date {
    return timestamp?.toDate() || null;
  }

  /**
   * Convierte una Date a timestamp de Firestore
   */
  dateToTimestamp(date: Date): admin.firestore.Timestamp {
    return admin.firestore.Timestamp.fromDate(date);
  }

  /**
   * Obtiene el timestamp actual de Firestore
   */
  getCurrentTimestamp(): admin.firestore.Timestamp {
    return admin.firestore.Timestamp.now();
  }

  /**
   * Obtiene FieldValue para operaciones especiales
   */
  getFieldValue() {
    return admin.firestore.FieldValue;
  }

  /**
   * Crea una referencia a un documento
   */
  createDocRef(collection: string, docId?: string): admin.firestore.DocumentReference {
    if (docId) {
      return this.firestore.collection(collection).doc(docId);
    }
    return this.firestore.collection(collection).doc();
  }

  /**
   * Crea una referencia a una colección
   */
  createCollectionRef(collection: string): admin.firestore.CollectionReference {
    return this.firestore.collection(collection);
  }

  /**
   * Ejecuta una transacción
   */
  async runTransaction<T>(
    updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>
  ): Promise<T> {
    return this.firestore.runTransaction(updateFunction);
  }

  /**
   * Crea un batch para operaciones múltiples
   */
  createBatch(): admin.firestore.WriteBatch {
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
  async getDocument(collection: string, docId: string): Promise<admin.firestore.DocumentSnapshot> {
    return this.firestore.collection(collection).doc(docId).get();
  }

  /**
   * Obtiene documentos de una colección con filtros
   */
  async getDocuments(
    collection: string,
    filters?: Array<{
      field: string;
      operator: admin.firestore.WhereFilterOp;
      value: any;
    }>,
    orderBy?: {
      field: string;
      direction: 'asc' | 'desc';
    },
    limit?: number
  ): Promise<admin.firestore.QuerySnapshot> {
    let query: admin.firestore.Query = this.firestore.collection(collection);

    // Aplicar filtros
    if (filters) {
      filters.forEach(filter => {
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
  async createDocument(collection: string, data: any, docId?: string): Promise<admin.firestore.DocumentReference> {
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
  async updateDocument(collection: string, docId: string, data: any): Promise<void> {
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
  async verifyIdToken(idToken: string, checkRevoked = true): Promise<admin.auth.DecodedIdToken> {
    return this.auth.verifyIdToken(idToken, checkRevoked);
  }

  /**
   * Obtiene información de un usuario por UID
   */
  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    return this.auth.getUser(uid);
  }

  /**
   * Obtiene información de un usuario por email
   */
  async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    return this.auth.getUserByEmail(email);
  }

  /**
   * Sube un archivo al Storage
   */
  async uploadFile(
    filePath: string,
    buffer: Buffer,
    metadata?: any
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