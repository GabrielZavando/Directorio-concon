import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { FirebaseService } from "@/common/services/firebase.service";
import slugify from "slugify";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";
import { UpdateEmpresaDto } from "./dto/update-empresa.dto";
import { Empresa } from "./entities/empresa.entity";
import type { EmpresaStatus } from "./entities/empresa-status";
import type {
  Firestore,
  CollectionReference,
  DocumentSnapshot,
  Query,
} from "firebase-admin/firestore";

export interface EmpresaFilter {
  categoriaId?: string;
  barrioId?: string;
  status?: EmpresaStatus;
  q?: string;
}

export interface PaginatedEmpresas {
  data: Empresa[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

@Injectable()
export class EmpresasService {
  private readonly logger = new Logger(EmpresasService.name);
  private readonly collectionName = "empresas";
  private readonly solicitudesCollection = "solicitudes";

  constructor(private readonly firebaseService: FirebaseService) {}

  private get firestore(): Firestore {
    return this.firebaseService.getFirestore();
  }

  private get collection(): CollectionReference {
    return this.firestore.collection(this.collectionName);
  }

  private toEmpresa(doc: DocumentSnapshot): Empresa {
    const data = doc.data() as Omit<Empresa, "id">;
    return { id: doc.id, ...data };
  }

  private buildSlug(nombre: string): string {
    return slugify(nombre, { lower: true, strict: true, locale: "es" });
  }

  private async assertSlugUnique(slug: string): Promise<void> {
    const snapshot = await this.collection
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      throw new ConflictException(`Slug duplicado: ${slug}`);
    }
  }

  async create(dto: CreateEmpresaDto): Promise<Empresa> {
    const slug = this.buildSlug(dto.nombre);
    await this.assertSlugUnique(slug);

    const docRef = this.collection.doc();
    const now = this.firebaseService.getCurrentTimestamp();

    const empresa: Omit<Empresa, "id"> = {
      nombre: dto.nombre,
      slug,
      descripcion: dto.descripcion,
      categoriaId: dto.categoriaId,
      barrioId: dto.barrioId,
      direccion: dto.direccion,
      telefono: dto.telefono,
      email: dto.email,
      sitioWeb: dto.sitioWeb,
      redesSociales: dto.redesSociales,
      planId: dto.planId,
      horarios: dto.horarios,
      servicios: dto.servicios,
      coordenadas: dto.coordenadas,
      logoUrl: dto.logoUrl,
      destacado: false,
      verificado: false,
      status: "pendiente",
      usuarioId: dto.usuarioId,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(empresa);

    await this.createSolicitud(docRef.id);

    this.logger.log(`Empresa creada: ${slug} (${docRef.id})`);
    return this.toEmpresa(await docRef.get());
  }

  private async createSolicitud(empresaId: string): Promise<void> {
    const solicitudRef = this.firestore
      .collection(this.solicitudesCollection)
      .doc();
    await solicitudRef.set({
      empresaId,
      usuarioId: "",
      tipo: "registro",
      status: "pendiente",
      createdAt: this.firebaseService.getCurrentTimestamp(),
    });
  }

  async findAll(
    filters: EmpresaFilter,
    page = 1,
    limit = 20,
  ): Promise<PaginatedEmpresas> {
    let query: Query = this.collection;

    if (filters.categoriaId) {
      query = query.where("categoriaId", "==", filters.categoriaId);
    }
    if (filters.barrioId) {
      query = query.where("barrioId", "==", filters.barrioId);
    }
    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }

    query = query.orderBy("createdAt", "desc");

    const allSnapshot = await query.get();
    let docs = allSnapshot.docs.map((d) => this.toEmpresa(d));

    if (filters.q) {
      const q = filters.q.toLowerCase();
      docs = docs.filter((e) => e.nombre.toLowerCase().includes(q));
    }

    const total = docs.length;
    const start = (page - 1) * limit;
    const paged = docs.slice(start, start + limit);

    return {
      data: paged,
      meta: { total, page, limit },
    };
  }

  async findOne(id: string): Promise<Empresa> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Empresa no encontrada: ${id}`);
    }
    return this.toEmpresa(doc);
  }

  async findBySlug(slug: string): Promise<Empresa> {
    const snapshot = await this.collection
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snapshot.empty) {
      throw new NotFoundException(`Empresa no encontrada: ${slug}`);
    }
    return this.toEmpresa(snapshot.docs[0]);
  }

  async update(id: string, dto: UpdateEmpresaDto): Promise<Empresa> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Empresa no encontrada: ${id}`);
    }

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.nombre) {
      updateData.slug = this.buildSlug(dto.nombre);
    }
    updateData.updatedAt = this.firebaseService.getCurrentTimestamp();

    await docRef.update(updateData);
    return this.toEmpresa(await docRef.get());
  }

  async remove(id: string): Promise<void> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Empresa no encontrada: ${id}`);
    }
    await docRef.delete();
  }
}
