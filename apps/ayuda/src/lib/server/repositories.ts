import type {
  AlliedSite,
  CommunityCenter,
  HospitalRecord,
  PatientPublicRecord,
  UsefulLink
} from '@sismo-ve/schemas';
import { createServerPocketBase } from '$lib/pocketbase/server';
import {
  fallbackAlliedSites,
  fallbackCenters,
  fallbackHospitals,
  fallbackPatients,
  fallbackUsefulLinks
} from './fallback-data';

type ListResponse<T> = { items: T[] };

async function tryList<T>(collection: string, filter?: string, sort = '-updated_at'): Promise<T[]> {
  try {
    const pb = createServerPocketBase();
    const response = await pb.collection(collection).getList<T>(1, 100, {
      filter,
      sort
    });
    return response.items;
  } catch {
    return [];
  }
}

export async function loadAlliedSites(): Promise<AlliedSite[]> {
  const records = await tryList<AlliedSite>('allied_sites', 'status = "approved"');
  return records.length > 0 ? records : fallbackAlliedSites;
}

export async function loadUsefulLinks(): Promise<UsefulLink[]> {
  const records = await tryList<UsefulLink>('useful_links', 'status = "approved"');
  return records.length > 0 ? records : fallbackUsefulLinks;
}

export async function loadHospitals(): Promise<HospitalRecord[]> {
  const records = await tryList<HospitalRecord>('hospitals', 'status = "approved"');
  return records.length > 0 ? records : fallbackHospitals;
}

export async function loadCenters(): Promise<CommunityCenter[]> {
  const records = await tryList<CommunityCenter>('collection_centers', 'status = "approved"');
  return records.length > 0 ? records : fallbackCenters;
}

export async function loadPatients(): Promise<PatientPublicRecord[]> {
  const records = await tryList<PatientPublicRecord>('patients_public', 'status != "archived"');
  return records.length > 0 ? records : fallbackPatients;
}

export async function submitQueuedRecord(collection: string, payload: Record<string, unknown>) {
  const pb = createServerPocketBase();
  return pb.collection(collection).create(payload);
}

export async function submitPatientImport(payload: Record<string, unknown>) {
  const pb = createServerPocketBase();
  return pb.collection('patients_public').create(payload);
}
