import type {
  AlliedSite,
  CommunityCenter,
  HospitalRecord,
  PatientPublicRecord,
  UsefulLink
} from '@sismo-ve/schemas';
import { createServerPocketBase } from '$lib/pocketbase/server';
import { fallbackList } from './fallback-db';
import { fallbackAlliedSites, fallbackUsefulLinks } from './fallback-data';

// Estrategia de datos:
// 1) Fuente de verdad: PocketBase (online-first).
// 2) Si PocketBase no responde, se sirve el snapshot SQLite de respaldo (estado degradado;
//    la hora del snapshot se muestra vía +layout.server.ts).
// 3) Para datos de referencia estáticos (aliados, links) hay un último recurso embebido.
// Los datos volátiles/sensibles (pacientes, hospitales) NO tienen respaldo estático: si no
// hay snapshot, la lista queda vacía en vez de mostrar copias inventadas.

async function pbList<T>(
  collection: string,
  filter?: string,
  sort = '-updated_at'
): Promise<{ ok: boolean; items: T[] }> {
  try {
    const pb = createServerPocketBase();
    const response = await pb.collection(collection).getList<T>(1, 200, { filter, sort });
    return { ok: true, items: response.items };
  } catch {
    return { ok: false, items: [] };
  }
}

export async function loadAlliedSites(): Promise<AlliedSite[]> {
  const { ok, items } = await pbList<AlliedSite>('allied_sites', 'status = "approved"');
  if (ok) return items;
  const snapshot = fallbackList<AlliedSite>('allied_sites');
  return snapshot.length > 0 ? snapshot : fallbackAlliedSites;
}

export async function loadUsefulLinks(): Promise<UsefulLink[]> {
  const { ok, items } = await pbList<UsefulLink>('useful_links', 'status = "approved"');
  if (ok) return items;
  const snapshot = fallbackList<UsefulLink>('useful_links');
  return snapshot.length > 0 ? snapshot : fallbackUsefulLinks;
}

export async function loadHospitals(): Promise<HospitalRecord[]> {
  const { ok, items } = await pbList<HospitalRecord>('hospitals', 'status = "approved"');
  return ok ? items : fallbackList<HospitalRecord>('hospitals');
}

export async function loadCenters(): Promise<CommunityCenter[]> {
  const { ok, items } = await pbList<CommunityCenter>('collection_centers', 'status = "approved"');
  return ok ? items : fallbackList<CommunityCenter>('collection_centers');
}

export async function loadPatients(): Promise<PatientPublicRecord[]> {
  const { ok, items } = await pbList<PatientPublicRecord>('patients_public', 'status != "archived"');
  return ok ? items : fallbackList<PatientPublicRecord>('patients_public');
}

export async function submitQueuedRecord(collection: string, payload: Record<string, unknown>) {
  const pb = createServerPocketBase();
  return pb.collection(collection).create(payload);
}

export async function submitPatientImport(payload: PatientPublicRecord | Record<string, unknown>) {
  const pb = createServerPocketBase();
  return pb.collection('patients_public').create(payload as Record<string, unknown>);
}
