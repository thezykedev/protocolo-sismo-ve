import type { PatientPublicRecord } from '@sismo-ve/schemas';
import { cedulaLast3, normalizeWhitespace } from '@sismo-ve/schemas';

export interface PatientSnapshotInput {
  html: string;
  sourceName?: string;
  sourceUrl?: string;
}

function stripTags(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function extractCells(rowHtml: string): string[] {
  const cellMatches = Array.from(rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi));
  return cellMatches.map((match) => normalizeWhitespace(stripTags(match[1] ?? '')));
}

function inferRecord(cells: string[]): { patient_name: string; cedula?: string; hospital?: string; public_notes?: string } {
  const [first = '', second = '', third = '', fourth = ''] = cells;
  const patient_name = first || second || third || 'Registro sin nombre';
  const cedula = [first, second, third, fourth].find((value) => /\d{3,}/.test(value)) ?? '';
  const hospital = [first, second, third, fourth].find((value) => /hospital|clinica|centro/i.test(value)) ?? '';
  // No publicar como nota una celda con secuencias largas de dígitos (teléfono, cédula completa,
  // documento): public_notes es para un resumen clínico breve, no para PII numérica.
  const public_notes = [first, second, third, fourth].find(
    (value) => value && value !== patient_name && value !== cedula && value !== hospital && !/\d{4,}/.test(value)
  ) ?? '';

  return { patient_name, cedula, hospital, public_notes };
}

export function normalizePatientSnapshot(input: PatientSnapshotInput): PatientPublicRecord[] {
  const now = new Date().toISOString();
  const rows = Array.from(input.html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  const records: PatientPublicRecord[] = [];

  rows.forEach((rowMatch, index) => {
    const rowHtml = rowMatch[1] ?? '';
    const cells = extractCells(rowHtml);
    if (cells.length === 0) return;

    const inferred = inferRecord(cells);
    const cedula = inferred.cedula ? cedulaLast3(inferred.cedula) : '000';

    records.push({
      id: `${input.sourceName ?? 'snapshot'}-${index + 1}`,
      status: 'public_unverified',
      patient_name: normalizeWhitespace(inferred.patient_name),
      cedula_last3: cedula,
      hospital: inferred.hospital ? normalizeWhitespace(inferred.hospital) : undefined,
      public_notes: inferred.public_notes ? normalizeWhitespace(inferred.public_notes) : undefined,
      source_type: 'public_reporter',
      verification_status: 'unverified',
      source_name: input.sourceName ?? 'manual snapshot',
      source_url: input.sourceUrl,
      source_record_id: `${input.sourceName ?? 'snapshot'}-${index + 1}`,
      imported_at: now
    });
  });

  return records;
}
