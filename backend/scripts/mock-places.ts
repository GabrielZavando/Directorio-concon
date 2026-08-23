/**
 * Mock places catalog for seed-places.ts — first half (10 Concón businesses).
 *
 * Split from the seed script so every file stays under the 300-line CI limit.
 * Every entry references a valid `categoriaId`, `subcategoriaId` and
 * `barrioId` from the catalog seeded by `seed.ts`.
 */
import type { ServicioEnum } from "../src/modules/places/domain/servicio.enum";
import type { MetodoPagoEnum } from "../src/modules/places/domain/metodo-pago.enum";

export interface MockPlace {
  nombre: string;
  slug: string;
  descripcionCorta: string;
  descripcion: string;
  categoriaId: string;
  subcategoriaId: string;
  barrioId: string;
  direccion: string;
  telefono?: string;
  whatsapp?: string;
  sitioWeb?: string;
  planId: "gratuito" | "premium";
  abierto24x7: boolean;
  servicios?: ServicioEnum[];
  metodosPago?: MetodoPagoEnum[];
  verificado: boolean;
  destacado: boolean;
}

export const MOCK_PLACES: MockPlace[] = [
  {
    nombre: "El Muelle Restaurante",
    slug: "el-muelle-restaurante",
    descripcionCorta: "Cocina de mar con vista al océano en Concón.",
    descripcion:
      "Restaurante familiar de mariscos y pescados frescos, con terraza frente al mar y menú de temporada.",
    categoriaId: "gastronomia",
    subcategoriaId: "restaurantes",
    barrioId: "la-costa",
    direccion: "Av. Borgoño 12345, Concón",
    telefono: "+56322234567",
    sitioWeb: "https://www.elmuelle.cl",
    planId: "premium",
    abierto24x7: false,
    servicios: [
      "wifi",
      "terraza",
      "vista-al-mar",
      "reservas",
      "estacionamiento",
    ],
    metodosPago: ["efectivo", "debito", "credito", "transferencia"],
    verificado: true,
    destacado: true,
  },
  {
    nombre: "Café Dunas",
    slug: "cafe-dunas",
    descripcionCorta: "Café de especialidad y repostería artesanal.",
    descripcion:
      "Cafetería de especialidad con granos tostados en Concón, repostería artesanal y espacio pet-friendly.",
    categoriaId: "gastronomia",
    subcategoriaId: "cafeterias",
    barrioId: "montemar",
    direccion: "Av. Los Pinos 110, Montemar",
    telefono: "+56322345678",
    whatsapp: "+56912345678",
    planId: "gratuito",
    abierto24x7: false,
    servicios: ["wifi", "apto-mascotas", "take-away", "terraza"],
    metodosPago: ["efectivo", "debito", "transferencia", "qr"],
    verificado: true,
    destacado: false,
  },
  {
    nombre: "La Boca Parrilla",
    slug: "la-boca-parrilla",
    descripcionCorta: "Parrilla chilena junto a la playa La Boca.",
    descripcion:
      "Parrilla tradicional chilena con carnes premium, ubicada a pasos de la playa La Boca.",
    categoriaId: "gastronomia",
    subcategoriaId: "restaurantes",
    barrioId: "la-costa",
    direccion: "Av. La Boca 78, Concón",
    telefono: "+56322345679",
    planId: "gratuito",
    abierto24x7: false,
    servicios: ["reservas", "estacionamiento", "terraza", "ninos-bienvenida"],
    metodosPago: ["efectivo", "debito", "credito", "transferencia"],
    verificado: false,
    destacado: true,
  },
  {
    nombre: "Heladería El Faro",
    slug: "heladeria-el-faro",
    descripcionCorta: "Helados artesanales con frutas de estación.",
    descripcion:
      "Helados artesanales elaborados con frutas de estación, sabores clásicos y veganos.",
    categoriaId: "gastronomia",
    subcategoriaId: "heladerias-y-postres",
    barrioId: "concon-sur",
    direccion: "Av. Mar de Fondo 234, Concón",
    planId: "gratuito",
    abierto24x7: false,
    servicios: ["take-away", "apto-mascotas", "ninos-bienvenida"],
    metodosPago: ["efectivo", "debito", "qr"],
    verificado: false,
    destacado: false,
  },
  {
    nombre: "Farmacia ConconSalud",
    slug: "farmacia-conconsalud",
    descripcionCorta: "Farmacia con despacho a domicilio en Concón.",
    descripcion:
      "Farmacia con amplio stock, atención farmacéutica y despacho a domicilio en toda Concón.",
    categoriaId: "comercio",
    subcategoriaId: "farmacias",
    barrioId: "concon-sur",
    direccion: "Av. Borgoño 987, Concón",
    telefono: "+56322345680",
    planId: "gratuito",
    abierto24x7: true,
    servicios: ["delivery", "estacionamiento"],
    metodosPago: ["efectivo", "debito", "credito"],
    verificado: true,
    destacado: false,
  },
  {
    nombre: "Artesanías Concón",
    slug: "artesanias-concon",
    descripcionCorta: "Artesanía local en greda, mimbre y madera.",
    descripcion:
      "Tienda de artesanías de Concón y la V Región: greda de Pomaire, mimbre, madera y cestería.",
    categoriaId: "comercio",
    subcategoriaId: "artesanias-y-souvenirs",
    barrioId: "villa-concon",
    direccion: "Av. Los Castaños 45, Villa Concón",
    planId: "gratuito",
    abierto24x7: false,
    servicios: ["apto-mascotas", "ninos-bienvenida"],
    metodosPago: ["efectivo", "debito", "qr"],
    verificado: false,
    destacado: false,
  },
  {
    nombre: "Hotel Bahía Montemar",
    slug: "hotel-bahia-montemar",
    descripcionCorta: "Hotel boutique con vista a la bahía de Montemar.",
    descripcion:
      "Hotel boutique frente al mar con piscina, restaurant y salas para eventos corporativos.",
    categoriaId: "turismo-y-recreacion",
    subcategoriaId: "hoteles-y-alojamiento",
    barrioId: "montemar",
    direccion: "Av. Mar de Fondo 1200, Montemar",
    telefono: "+56322345681",
    sitioWeb: "https://www.hotelbahiamontemar.cl",
    planId: "premium",
    abierto24x7: true,
    servicios: ["wifi", "estacionamiento", "reservas", "vista-al-mar"],
    metodosPago: ["efectivo", "debito", "credito", "transferencia"],
    verificado: true,
    destacado: true,
  },
  {
    nombre: "Cabañas Los Robles",
    slug: "cabanas-los-robles",
    descripcionCorta: "Cabañas familiares con quincho y piscina.",
    descripcion:
      "Complejo de cabañas para 2 a 6 personas con quincho, piscina temporada y acceso a playa.",
    categoriaId: "turismo-y-recreacion",
    subcategoriaId: "cabanas-y-camping",
    barrioId: "los-troncos",
    direccion: "Camino Viejo 500, Los Troncos",
    telefono: "+56322345682",
    planId: "gratuito",
    abierto24x7: false,
    servicios: ["wifi", "estacionamiento", "apto-mascotas", "ninos-bienvenida"],
    metodosPago: ["efectivo", "transferencia"],
    verificado: false,
    destacado: false,
  },
  {
    nombre: "Escuela de Surf Dunas",
    slug: "escuela-de-surf-dunas",
    descripcionCorta: "Clases de surf y arriendo de equipos en Playa La Boca.",
    descripcion:
      "Escuela de surf certificada con clases grupales y privadas, arriendo de tablas y trajes.",
    categoriaId: "turismo-y-recreacion",
    subcategoriaId: "escuelas-de-surf-y-sup",
    barrioId: "la-costa",
    direccion: "Playa La Boca s/n, Concón",
    telefono: "+56912345679",
    whatsapp: "+56912345679",
    planId: "gratuito",
    abierto24x7: false,
    servicios: ["reservas", "ninos-bienvenida"],
    metodosPago: ["efectivo", "debito", "transferencia", "qr"],
    verificado: false,
    destacado: true,
  },
  {
    nombre: "Inmobiliaria Costa Verde",
    slug: "inmobiliaria-costa-verde",
    descripcionCorta: "Venta y arriendo de propiedades en Concón.",
    descripcion:
      "Corretaje de propiedades en Concón y Viña del Mar: departamentos, casas y terrenos.",
    categoriaId: "servicios-profesionales",
    subcategoriaId: "inmobiliarias",
    barrioId: "vista-al-mar",
    direccion: "Av. Vista al Mar 400, Concón",
    telefono: "+56322345683",
    sitioWeb: "https://www.costaverde.cl",
    planId: "gratuito",
    abierto24x7: false,
    servicios: ["wifi", "estacionamiento"],
    metodosPago: ["efectivo", "transferencia"],
    verificado: true,
    destacado: false,
  },
];
