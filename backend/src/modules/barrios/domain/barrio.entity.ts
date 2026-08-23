/**
 * Barrio — Entity root del módulo barrios.
 * Persistida en colección Firestore `barrios`. Inmutable.
 */
export interface BarrioProps {
  id: string;
  nombre: string;
  slug: string;
  tipo: "urbano" | "rural";
  descripcion?: string;
  territorio?: string;
  coordenadas?: { lat: number; lng: number };
  codigo?: string;
  activo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const SLUG_REGEX = /^[a-z0-9-]+$/;

export class Barrio {
  readonly id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly tipo: "urbano" | "rural";
  readonly descripcion?: string;
  readonly territorio?: string;
  readonly coordenadas?: { lat: number; lng: number };
  readonly codigo?: string;
  readonly activo: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: BarrioProps) {
    Barrio.assertValidProps(props);

    const now = new Date();
    this.id = props.id;
    this.nombre = props.nombre;
    this.slug = props.slug;
    this.tipo = props.tipo;
    this.descripcion = props.descripcion;
    this.territorio = props.territorio;
    this.coordenadas = props.coordenadas;
    this.codigo = props.codigo;
    this.activo = props.activo ?? true;
    this.createdAt = props.createdAt ?? now;
    this.updatedAt = props.updatedAt ?? now;
  }

  private static assertValidProps(props: BarrioProps): void {
    if (typeof props.id !== "string" || props.id.length === 0) {
      throw new Error("Barrio.id must be a non-empty string");
    }
    if (typeof props.nombre !== "string" || props.nombre.trim().length === 0) {
      throw new Error("Barrio.nombre must be a non-empty string");
    }
    if (typeof props.slug !== "string" || !SLUG_REGEX.test(props.slug)) {
      throw new Error(`Barrio.slug must match ${SLUG_REGEX.toString()}`);
    }
    if (props.tipo !== "urbano" && props.tipo !== "rural") {
      throw new Error("Barrio.tipo must be 'urbano' or 'rural'");
    }
  }

  deactivate(): Barrio {
    return new Barrio({
      ...this,
      activo: false,
      updatedAt: new Date(),
    });
  }

  activate(): Barrio {
    return new Barrio({
      ...this,
      activo: true,
      updatedAt: new Date(),
    });
  }
}
