#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';

function usage() {
  console.error('Uso: pnpm --dir apps/ayuda import:patients --source <archivo.html> [--sourceName Nombre] [--sourceUrl URL]');
  process.exit(1);
}

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function cedulaLast3(value) {
  const digits = value.replace(/\D/g, '');
  return digits.slice(-3).padStart(3, '0');
}

const sourceIndex = process.argv.indexOf('--source');
if (sourceIndex === -1 || !process.argv[sourceIndex + 1]) usage();

const sourceNameIndex = process.argv.indexOf('--sourceName');
const sourceUrlIndex = process.argv.indexOf('--sourceUrl');
const sourcePath = process.argv[sourceIndex + 1];
const sourceName = sourceNameIndex !== -1 ? process.argv[sourceNameIndex + 1] : 'manual snapshot';
const sourceUrl = sourceUrlIndex !== -1 ? process.argv[sourceUrlIndex + 1] : '';

const html = await readFile(sourcePath, 'utf8');
const rows = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));

const records = rows.flatMap((rowMatch, index) => {
  const rowHtml = rowMatch[1] ?? '';
  const cells = Array.from(rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((match) =>
    normalizeWhitespace(stripTags(match[1] ?? ''))
  );

  if (cells.length === 0) return [];

  const [first = '', second = '', third = '', fourth = ''] = cells;
  const patient_name = first || second || third || 'Registro sin nombre';
  const cedula = [first, second, third, fourth].find((value) => /\d{3,}/.test(value)) ?? '';
  const hospital = [first, second, third, fourth].find((value) => /hospital|clinica|centro/i.test(value)) ?? '';
  const public_notes = [first, second, third, fourth].find((value) => value && value !== patient_name && value !== cedula && value !== hospital) ?? '';

  return [
    {
      id: `${sourceName}-${index + 1}`,
      status: 'public_unverified',
      patient_name: normalizeWhitespace(patient_name),
      cedula_last3: cedula ? cedulaLast3(cedula) : '000',
      hospital: hospital ? normalizeWhitespace(hospital) : undefined,
      public_notes: public_notes ? normalizeWhitespace(public_notes) : undefined,
      source_type: 'public_reporter',
      verification_status: 'unverified',
      source_name: sourceName,
      source_url: sourceUrl || undefined,
      source_record_id: `${sourceName}-${index + 1}`,
      imported_at: new Date().toISOString()
    }
  ];
});

console.log(JSON.stringify({ count: records.length, records }, null, 2));
