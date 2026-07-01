export type ModerationStatus = 'approved' | 'pending' | 'rejected' | 'archived';

export type PublicVisibilityStatus = 'public_unverified' | 'verified' | 'pending' | 'archived' | 'rejected';

export type PatientSex = 'female' | 'male' | 'unknown' | 'other';
// Único origen de los estados clínicos públicos: el tipo se deriva del arreglo, así que la
// validación en runtime y el tipo no pueden divergir.
export const PATIENT_CONDITIONS = [
  'stable',
  'observation',
  'hospitalized',
  'discharged',
  'unknown',
  'deceased_unconfirmed',
  'deceased_verified'
] as const;
export type PatientCondition = (typeof PATIENT_CONDITIONS)[number];
export type VerificationStatus = 'unverified' | 'source_confirmed' | 'hospital_confirmed' | 'moderator_confirmed';
export type SourceType = 'family' | 'hospital_staff' | 'volunteer' | 'public_reporter' | 'moderator';
export type PatientImportSource = 'public_render' | 'manual_html' | 'private_api';
export type PatientImportTarget = 'patients_public' | 'patient_private_notes';
export type CollectionType = 'acopio' | 'shelter' | 'logistics' | 'medical_support' | 'water' | 'food' | 'other';
export type AllyCategory = string;
export type SeismicSource = 'funvisis' | 'usgs' | 'emsc' | 'geofon' | 'gdacs' | 'manual' | 'sgc';
export type SeismicStatus = 'active' | 'superseded' | 'hidden';
export type AlertLevel = 'none' | 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
export type EventClass = 'micro' | 'minor' | 'light' | 'moderate' | 'strong' | 'major' | 'unknown';
export type SyncSourceType = 'patients' | 'hospitals' | 'seismic';
export type SyncStatus = 'success' | 'partial' | 'failed';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface HospitalRecord {
  id: string;
  status: ModerationStatus;
  name: string;
  city: string;
  state: string;
  address?: string;
  coords_lat?: number;
  coords_lng?: number;
  phones?: string[];
  services?: string[];
  capacity_note?: string;
  source_type?: SourceType;
  verification_status?: VerificationStatus;
  source_name?: string;
  source_url?: string;
  source_record_id?: string;
  source_updated_at?: string;
  imported_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityCenter {
  id: string;
  status: ModerationStatus;
  name: string;
  type: CollectionType;
  city: string;
  state: string;
  address?: string;
  coords_lat?: number;
  coords_lng?: number;
  needs?: string;
  schedule?: string;
  contact_public?: string;
  source_type?: SourceType;
  verification_status?: VerificationStatus;
  created_at?: string;
  updated_at?: string;
}

export interface AlliedSite {
  id: string;
  status: ModerationStatus;
  name: string;
  category: AllyCategory;
  city?: string;
  state?: string;
  website?: string;
  contact_public?: string;
  notes_public?: string;
  verification_status?: VerificationStatus;
  created_at?: string;
  updated_at?: string;
}

export interface UsefulLink {
  id: string;
  status: ModerationStatus;
  title: string;
  category: string;
  url: string;
  description: string;
}

export interface PatientPublicRecord {
  id: string;
  status: PublicVisibilityStatus;
  patient_name: string;
  age?: number;
  age_is_estimated?: boolean;
  sex?: PatientSex;
  cedula_last3: string;
  hospital?: string;
  location_note?: string;
  condition_public?: PatientCondition;
  last_seen_at?: string;
  source_type?: SourceType;
  verification_status?: VerificationStatus;
  source_name?: string;
  source_url?: string;
  source_record_id?: string;
  source_updated_at?: string;
  imported_at?: string;
  public_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PatientPrivateNote {
  id: string;
  patient: string;
  cedula_full?: string;
  cedula_hash?: string;
  contact_name?: string;
  contact_phone?: string;
  reporter_relationship?: string;
  internal_notes?: string;
  source_evidence_files?: string[];
  moderation_status?: ModerationStatus;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateQueueEntry {
  id: string;
  target_collection: string;
  target_record: string;
  payload_json: string;
  submitted_by_name?: string;
  submitted_by_contact?: string;
  status: 'pending' | 'accepted' | 'rejected';
  moderator_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RemovalRequest {
  id: string;
  target_collection: string;
  target_record: string;
  requester_name: string;
  requester_contact?: string;
  relationship?: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface ModerationLog {
  id: string;
  target_collection: string;
  target_record: string;
  action: 'create' | 'approve' | 'reject' | 'update' | 'archive' | 'restore' | 'remove_public_field';
  moderator: string;
  notes?: string;
  created_at?: string;
}

export interface DonationRecord {
  id: string;
  provider: 'paypal' | 'crypto' | 'manual';
  amount?: number;
  currency?: string;
  transaction_id?: string;
  wallet_network?: string;
  public_name?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  created_at?: string;
}

export interface SeismicEvent {
  id: string;
  status: SeismicStatus;
  source: SeismicSource;
  source_event_id: string;
  source_url: string;
  title: string;
  place: string;
  state_region?: string;
  event_time: string;
  updated_at_source?: string;
  magnitude: number;
  magnitude_type?: string;
  depth_km?: number;
  coords_lat: number;
  coords_lng: number;
  felt_reports_count?: number;
  alert_level?: AlertLevel;
  event_class?: EventClass;
  mainshock_candidate?: boolean;
  review_status?: 'automatic' | 'reviewed' | 'manual';
  created_at?: string;
  updated_at?: string;
}

export interface SourceSyncRun {
  id: string;
  source_name: string;
  source_url?: string;
  source_type: SyncSourceType;
  status: SyncStatus;
  started_at: string;
  finished_at?: string;
  records_seen?: number;
  records_created?: number;
  records_updated?: number;
  records_skipped?: number;
  error_message?: string;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function cedulaLast3(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.slice(-3).padStart(3, '0');
}

// Campos públicos que un cambio sugerido por la comunidad puede tocar, por colección.
// Cualquier otra clave del payload se descarta: un envío público no puede cambiar status,
// fuentes, ni filtrar campos privados. Esta es la regla de privacidad como dato, en un solo
// lugar, junto a los tipos que gobierna.
export const PUBLIC_PATCH_FIELDS: Record<string, string[]> = {
  patients_public: [
    'patient_name',
    'age',
    'cedula_last3',
    'condition_public',
    'public_notes',
    'hospital',
    'location_note',
    'sex',
    'last_seen_at'
  ],
  hospitals: ['name', 'city', 'state', 'address', 'capacity_note', 'phones', 'services'],
  collection_centers: ['name', 'city', 'state', 'address', 'needs', 'schedule', 'contact_public'],
  allied_sites: ['name', 'category', 'city', 'state', 'website', 'contact_public', 'notes_public'],
  useful_links: ['title', 'category', 'url', 'description']
};

// Proyecta un payload arbitrario a solo los campos publicables de la colección y reduce la
// cédula a sus 3 últimos dígitos. Único punto que decide qué se publica: úsalo en toda ruta
// que aplique un cambio sugerido a un registro público.
export function sanitizePublicPatch(
  collection: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const allowed = PUBLIC_PATCH_FIELDS[collection] ?? [];
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in payload) out[key] = payload[key];
  }
  if (typeof out.cedula_last3 === 'string') {
    out.cedula_last3 = cedulaLast3(out.cedula_last3);
  }
  return out;
}

// Seam de ENTRADA de formularios de admisión: coerción + trim + reglas de campos requeridos en
// un solo lugar, en vez de re-escribir String(get()??'').trim() y chequeos sueltos en cada ruta.
// Hace par con sanitizePublicPatch (el seam de salida). Devuelve el valor limpio o los errores.
export interface ParseResult<T> {
  ok: boolean;
  value: T;
  errors: string[];
}

export interface PatientSubmission {
  patient_name: string;
  cedula_last3: string;
  hospital?: string;
  condition_public: string;
  source_name: string;
  source_url?: string;
  public_notes?: string;
}

export function parsePatientSubmission(form: FormData): ParseResult<PatientSubmission> {
  const errors: string[] = [];
  const patient_name = String(form.get('patient_name') ?? '').trim();
  const cedulaDigits = String(form.get('cedula') ?? '').replace(/\D/g, '');
  const hospital = String(form.get('hospital') ?? '').trim();
  const condition_public = String(form.get('condition_public') ?? '').trim() || 'unknown';
  const source_name = String(form.get('source_name') ?? '').trim();
  const source_url = String(form.get('source_url') ?? '').trim();
  const public_notes = String(form.get('public_notes') ?? '').trim();

  if (!patient_name) errors.push('Completa el nombre del paciente.');
  if (cedulaDigits.length < 3) errors.push('La cédula debe tener al menos 3 dígitos.');

  return {
    ok: errors.length === 0,
    value: {
      patient_name,
      cedula_last3: cedulaLast3(cedulaDigits),
      hospital: hospital || undefined,
      condition_public,
      source_name: source_name || 'Formulario público',
      source_url: source_url || undefined,
      public_notes: public_notes || undefined
    },
    errors
  };
}

export function eventClassFromMagnitude(magnitude: number): EventClass {
  if (!Number.isFinite(magnitude)) return 'unknown';
  if (magnitude < 2) return 'micro';
  if (magnitude < 3) return 'minor';
  if (magnitude < 4) return 'light';
  if (magnitude < 5) return 'moderate';
  if (magnitude < 6) return 'strong';
  return 'major';
}
