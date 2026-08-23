/**
 * Mock eventos catalog for seed-places.ts — 12 Concón events.
 *
 * Split from the seed script so every file stays under the 300-line CI limit.
 * Every entry uses `categoriaId: "eventos"` and a valid `subcategoriaId` from
 * that categoria's 10 seeded subcategorias.
 */
import type { PrecioTipo } from "../src/modules/eventos/domain/precio-tipo.enum";
import type { PrecioMoneda } from "../src/modules/eventos/domain/precio-moneda.enum";
import type { PublicoObjetivoEnum } from "../src/modules/eventos/domain/publico-objetivo.enum";
import type { NivelRuido } from "../src/modules/eventos/domain/nivel-ruido.enum";

export interface MockEvento {
  nombre: string;
  slug: string;
  descripcionCorta: string;
  descripcion: string;
  subcategoriaId: string;
  barrioId: string;
  organizador: string;
  organizadorContacto?: string;
  organizadorWeb?: string;
  ubicacionNombre?: string;
  ubicacionDireccion: string;
  fechaInicio: Date;
  fechaFin: Date;
  precioTipo: PrecioTipo;
  precioValor: number;
  precioMoneda: PrecioMoneda;
  publicoObjetivo: PublicoObjetivoEnum[];
  nivelRuido: NivelRuido;
  destacado: boolean;
}
export const MOCK_EVENTOS: MockEvento[] = [
  {
    nombre: "Festival de Música Dunas",
    slug: "festival-de-musica-dunas",
    descripcionCorta: "Tres días de música en vivo en la playa.",
    descripcion:
      "Festival de verano con bandas locales y nacionales, food trucks y zona familiar.",
    subcategoriaId: "festivales-culturales",
    barrioId: "la-costa",
    organizador: "Municipalidad de Concón",
    organizadorWeb: "https://www.concon.cl",
    ubicacionNombre: "Playa La Boca",
    ubicacionDireccion: "Playa La Boca, Concón",
    fechaInicio: new Date("2026-02-13T18:00:00Z"),
    fechaFin: new Date("2026-02-15T23:59:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "todos", "adolescentes"],
    nivelRuido: "alto",
    destacado: true,
  },
  {
    nombre: "Feria Gastronómica del Mar",
    slug: "feria-gastronomica-del-mar",
    descripcionCorta: "Sabores del mar de Concón en un solo lugar.",
    descripcion:
      "Feria gastronómica con cocineros locales, degustaciones y emprendimientos de la zona.",
    subcategoriaId: "ferias-gastronomicas",
    barrioId: "montemar",
    organizador: "Asociación de Emprendedores de Concón",
    organizadorContacto: "contacto@emprendeconcon.cl",
    ubicacionNombre: "Borde Costero Montemar",
    ubicacionDireccion: "Av. Mar de Fondo, Montemar",
    fechaInicio: new Date("2026-01-24T11:00:00Z"),
    fechaFin: new Date("2026-01-25T22:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "todos"],
    nivelRuido: "medio",
    destacado: true,
  },
  {
    nombre: "Concierto de Año Nuevo",
    slug: "concierto-de-ano-nuevo",
    descripcionCorta: "Orquesta en vivo para recibir el año en la costanera.",
    descripcion:
      "Concierto sinfónico al aire libre con orquesta invitada para despedir el año.",
    subcategoriaId: "conciertos-y-shows",
    barrioId: "la-costa",
    organizador: "Corporación Cultural de Concón",
    organizadorWeb: "https://www.culturaconcon.cl",
    ubicacionNombre: "Costanera Borgoño",
    ubicacionDireccion: "Av. Borgoño 12000, Concón",
    fechaInicio: new Date("2026-12-31T21:00:00Z"),
    fechaFin: new Date("2027-01-01T01:30:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "adultos", "tercera_edad", "todos"],
    nivelRuido: "medio",
    destacado: true,
  },
  {
    nombre: "Campeonato de Surf La Boca",
    slug: "campeonato-de-surf-la-boca",
    descripcionCorta: "Competencia nacional de surf en Playa La Boca.",
    descripcion:
      "Fechas del circuito nacional de surf con categorías open, juniors y damas.",
    subcategoriaId: "deportes-y-competencias",
    barrioId: "la-costa",
    organizador: "Club de Surf Concón",
    organizadorContacto: "+56912345690",
    ubicacionNombre: "Playa La Boca",
    ubicacionDireccion: "Playa La Boca, Concón",
    fechaInicio: new Date("2026-03-07T09:00:00Z"),
    fechaFin: new Date("2026-03-08T18:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["todos", "adolescentes", "familia"],
    nivelRuido: "alto",
    destacado: false,
  },
  {
    nombre: "Taller de Cerámica Abierto",
    slug: "taller-de-ceramica-abierto",
    descripcionCorta: "Talleres gratuitos de cerámica para todas las edades.",
    descripcion:
      "Talleres de cerámica al aire libre con artistas locales, materiales incluidos.",
    subcategoriaId: "talleres-y-clases-abiertas",
    barrioId: "concon-sur",
    organizador: "Taller Municipal de Artes",
    organizadorWeb: "https://www.concon.cl",
    ubicacionNombre: "Plaza de Concón",
    ubicacionDireccion: "Av. Mar de Fondo, Plaza de Concón",
    fechaInicio: new Date("2026-02-07T10:00:00Z"),
    fechaFin: new Date("2026-02-07T14:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "ninos", "todos"],
    nivelRuido: "bajo",
    destacado: false,
  },
  {
    nombre: "Fiesta de la Vendimia Costera",
    slug: "fiesta-de-la-vendimia-costera",
    descripcionCorta: "Celebración del vino y la cocina chilena.",
    descripcion:
      "Degustación de vinos de la región, música folclórica y gastronomía típica.",
    subcategoriaId: "fiestas-patrias",
    barrioId: "vista-al-mar",
    organizador: "Agrupación Viñedos Costeros",
    organizadorWeb: "https://www.vinedoscosteros.cl",
    ubicacionNombre: "Mirador Vista al Mar",
    ubicacionDireccion: "Av. Vista al Mar, Concón",
    fechaInicio: new Date("2026-04-25T12:00:00Z"),
    fechaFin: new Date("2026-04-26T20:00:00Z"),
    precioTipo: "pago",
    precioValor: 15000,
    precioMoneda: "CLP",
    publicoObjetivo: ["adultos", "todos"],
    nivelRuido: "medio",
    destacado: false,
  },
  {
    nombre: "Feria Libre de Concón",
    slug: "feria-libre-de-concon",
    descripcionCorta: "Feria de productos locales y agricultura familiar.",
    descripcion:
      "Feria semanal con verduras, frutas, quesos y artesanías de agricultores locales.",
    subcategoriaId: "ferias-libres",
    barrioId: "villa-concon",
    organizador: "Feria Libre de Villa Concón",
    ubicacionNombre: "Av. Los Castaños",
    ubicacionDireccion: "Av. Los Castaños con Los Tilos, Villa Concón",
    fechaInicio: new Date("2026-08-15T08:00:00Z"),
    fechaFin: new Date("2026-08-15T14:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "tercera_edad", "todos"],
    nivelRuido: "bajo",
    destacado: false,
  },
  {
    nombre: "Mercado Sustentable Dunas",
    slug: "mercado-sustentable-dunas",
    descripcionCorta: "Feria de emprendimientos sustentables y reciclaje.",
    descripcion:
      "Emprendimientos de economía circular, talleres de reciclaje y gastronomía sustentable.",
    subcategoriaId: "mercados-sustentables",
    barrioId: "concon-sur",
    organizador: "Mesa Ambiental de Concón",
    organizadorContacto: "medioambiente@concon.cl",
    ubicacionNombre: "Parque Municipal",
    ubicacionDireccion: "Av. Concón Sur, Parque Municipal",
    fechaInicio: new Date("2026-09-05T10:00:00Z"),
    fechaFin: new Date("2026-09-06T19:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "todos"],
    nivelRuido: "bajo",
    destacado: true,
  },
  {
    nombre: "Noche de San Juan en Concón",
    slug: "noche-de-san-juan-en-concon",
    descripcionCorta: "Fogata tradicional con música y comidas típicas.",
    descripcion:
      "Celebración de San Juan con fogata comunitaria, mitos y leyendas, música y sopaipillas.",
    subcategoriaId: "fiestas-patrias",
    barrioId: "los-troncos",
    organizador: "Junta de Vecinos Los Troncos",
    ubicacionNombre: "Sede Vecinal Los Troncos",
    ubicacionDireccion: "Camino Viejo 600, Los Troncos",
    fechaInicio: new Date("2026-06-23T19:00:00Z"),
    fechaFin: new Date("2026-06-23T23:59:00Z"),
    precioTipo: "donacion",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "todos"],
    nivelRuido: "medio",
    destacado: false,
  },
  {
    nombre: "Día de la Familia en la Playa",
    slug: "dia-de-la-familia-en-la-playa",
    descripcionCorta: "Jornada familiar con juegos y actividades en la arena.",
    descripcion:
      "Juegos inflables, deportes de playa, música y actividades para niños y adultos.",
    subcategoriaId: "eventos-familiares",
    barrioId: "la-costa",
    organizador: "Municipalidad de Concón",
    organizadorWeb: "https://www.concon.cl",
    ubicacionNombre: "Playa La Boca",
    ubicacionDireccion: "Playa La Boca, Concón",
    fechaInicio: new Date("2026-10-11T10:00:00Z"),
    fechaFin: new Date("2026-10-11T18:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["familia", "ninos", "todos"],
    nivelRuido: "medio",
    destacado: false,
  },
  {
    nombre: "Temporada de Verano: Noche de Música",
    slug: "temporada-de-verano-noche-de-musica",
    descripcionCorta: "Ciclo de conciertos de verano en la costanera.",
    descripcion:
      "Conciertos semanales de verano con artistas invitados cada jueves en la costanera.",
    subcategoriaId: "temporada-de-verano",
    barrioId: "montemar",
    organizador: "Corporación Cultural de Concón",
    organizadorWeb: "https://www.culturaconcon.cl",
    ubicacionNombre: "Anfiteatro Montemar",
    ubicacionDireccion: "Av. Mar de Fondo, Montemar",
    fechaInicio: new Date("2026-01-15T20:00:00Z"),
    fechaFin: new Date("2026-01-15T23:00:00Z"),
    precioTipo: "gratis",
    precioValor: 0,
    precioMoneda: "CLP",
    publicoObjetivo: ["adultos", "todos", "adolescentes"],
    nivelRuido: "alto",
    destacado: false,
  },
  {
    nombre: "Maratón Dunas y Océano",
    slug: "maraton-dunas-y-oceano",
    descripcionCorta: "Maratón por la costanera de Concón.",
    descripcion:
      "Carrera 10K y 21K por la costanera con llegada en Playa La Boca, categorías por edad.",
    subcategoriaId: "deportes-y-competencias",
    barrioId: "la-costa",
    organizador: "Club Atlético Concón",
    organizadorContacto: "carreras@clubconcon.cl",
    ubicacionNombre: "Costanera Borgoño",
    ubicacionDireccion: "Av. Borgoño 13000, Concón",
    fechaInicio: new Date("2026-11-15T07:00:00Z"),
    fechaFin: new Date("2026-11-15T13:00:00Z"),
    precioTipo: "pago",
    precioValor: 25000,
    precioMoneda: "CLP",
    publicoObjetivo: ["adultos", "adolescentes"],
    nivelRuido: "medio",
    destacado: false,
  },
];
