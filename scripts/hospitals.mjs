// Registro de hospitales/listas del Drive SISMO 2026 VZLA: única fuente de verdad para la ingesta.
//
// Cada entrada mapea la CARPETA del Drive (bajo data/drive_data/SISMO 2026 VZLA/) a:
//   - slug:        identificador estable en disco y en URLs de la app (data/ingest/extracted/<slug>).
//   - display:     nombre humano del hospital para la UI y los registros públicos.
//   - source_name: etiqueta de fuente en patients_public (mayúsculas, sin acentos).
//   - vr_aliases:  variantes con las que Venezuela Reporta nombra el sitio en `ubicacion`
//                  (se usan para acotar el pool de candidatos al verificar; matching laxo).
//   - kind:        'hospital' (lista de pacientes) u 'other' (link/no-lista → no se extrae).
//
// El extractor y el ensamblador leen este registro; la app NO lo importa: el ensamblador hornea
// display/slug/image_root en cada manifest.json, así la app se desacopla de este archivo Node.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DRIVE_ROOT = path.join(ROOT, 'data/drive_data/SISMO 2026 VZLA');
export const EXTRACT_ROOT = path.join(ROOT, 'data/ingest/extracted');

export const HOSPITALS = [
  {
    folder: 'CLINICAS EL AVILA',
    slug: 'clinica-el-avila',
    display: 'Clinica El Avila',
    source_name: 'CLINICA EL AVILA OCR',
    vr_aliases: ['el avila', 'avila'],
    kind: 'hospital'
  },
  {
    folder: 'HOSPITAL CARLOS ARVELEDO',
    slug: 'hospital-carlos-arveledo',
    display: 'Hospital Militar Dr. Carlos Arveledo',
    source_name: 'HOSPITAL CARLOS ARVELEDO OCR',
    vr_aliases: ['carlos arveledo', 'arveledo', 'militar'],
    kind: 'hospital'
  },
  {
    folder: 'HOSPITAL CIUDAD CARIBIA',
    slug: 'hospital-ciudad-caribia',
    display: 'Hospital Ciudad Caribia',
    source_name: 'HOSPITAL CIUDAD CARIBIA OCR',
    vr_aliases: ['ciudad caribia', 'caribia'],
    kind: 'hospital'
  },
  {
    folder: 'HOSPITAL DE CATIA',
    slug: 'hospital-de-catia',
    display: 'Hospital de Catia (Perico)',
    source_name: 'HOSPITAL DE CATIA OCR',
    vr_aliases: ['catia', 'perico', 'los magallanes'],
    kind: 'hospital'
  },
  {
    folder: 'HOSPITAL LUCIANI CARACAS',
    slug: 'hospital-luciani',
    display: 'Hospital Luciani (Caracas)',
    source_name: 'HOSPITAL LUCIANI OCR',
    vr_aliases: ['luciani'],
    kind: 'hospital'
  },
  {
    folder: 'HOSPITAL PEREZ CARREÑO',
    slug: 'hospital-perez-carreno',
    display: 'Hospital Dr. Miguel Perez Carreno',
    source_name: 'HOSPITAL PEREZ CARRENO OCR',
    vr_aliases: ['perez carreno', 'perez carreño', 'carreno'],
    kind: 'hospital'
  },
  {
    folder: 'HOSPITAL UNIVERSITARIO CARACAS',
    slug: 'hospital-universitario-caracas',
    display: 'Hospital Universitario de Caracas',
    source_name: 'HOSPITAL UNIVERSITARIO CARACAS OCR',
    vr_aliases: ['universitario', 'huc', 'clinico universitario'],
    kind: 'hospital'
  },
  {
    folder: 'HOSPITAL VARGAS DE CARACAS',
    slug: 'hospital-vargas',
    display: 'Hospital Vargas de Caracas',
    source_name: 'HOSPITAL VARGAS OCR',
    vr_aliases: ['vargas'],
    kind: 'hospital'
  },
  {
    folder: 'Sobrevivientes en campo de golf Playa Los cocos',
    slug: 'sobrevivientes-golf-los-cocos',
    display: 'Sobrevivientes - campo de golf Playa Los Cocos',
    source_name: 'CAMPO DE GOLF LOS COCOS OCR',
    vr_aliases: ['los cocos', 'playa los cocos', 'campo de golf'],
    kind: 'hospital'
  },
  {
    folder: 'LISTA DIGITALIZADA DIFERENTES ESTADOS',
    slug: 'lista-digitalizada-estados',
    display: 'Lista digitalizada - varios estados',
    source_name: 'LISTA DIGITALIZADA OCR',
    vr_aliases: [],
    kind: 'hospital'
  },
  {
    folder: 'LINK DE BUSQUEDA DE PERSONAS',
    slug: 'link-busqueda-personas',
    display: 'Link de busqueda de personas',
    source_name: 'LINK BUSQUEDA OCR',
    vr_aliases: [],
    kind: 'other'
  }
];

export function hospitalBySlug(slug) {
  return HOSPITALS.find((h) => h.slug === slug) ?? null;
}

export function hospitalByFolder(folder) {
  return HOSPITALS.find((h) => h.folder === folder) ?? null;
}

export function imageRootFor(hospital) {
  return path.join(DRIVE_ROOT, hospital.folder);
}

export function extractRootFor(hospital) {
  return path.join(EXTRACT_ROOT, hospital.slug);
}
