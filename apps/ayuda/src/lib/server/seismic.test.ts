import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapGEOFONRow, loadSeismicSnapshot, type SeismicSourceAdapter } from './seismic.ts';
import type { SeismicEvent } from '@sismo-ve/schemas';

// Regresión del bug conocido (ver memory/geofon-fdsn-utc-quirk.md): GEOFON emite el tiempo
// FDSN-text sin designador de zona; sin forzar 'Z' se interpreta como hora local del host y
// desfasa el evento. Ahora se puede aseverar a través de la interfaz exportada, sin red.
test('mapGEOFONRow reads a zone-less FDSN time as UTC', () => {
  const row =
    'gfz2026abcd|2026-06-24T22:05:05.56|10.5|-66.0|12|GFZ|GEOFON|GFZ|gfz2026abcd|mb|4.8|GFZ|Near coast of Venezuela';
  const event = mapGEOFONRow(row);
  assert.ok(event);
  assert.equal(event?.event_time, '2026-06-24T22:05:05.560Z');
  assert.equal(event?.source, 'geofon');
  assert.equal(event?.magnitude, 4.8);
});

test('mapGEOFONRow skips the FDSN header/comment row', () => {
  assert.equal(mapGEOFONRow('#EventID|Time|Latitude|Longitude|Depth|Author'), null);
});

function quake(over: Partial<SeismicEvent>): SeismicEvent {
  return {
    id: 'x',
    status: 'active',
    source: 'usgs',
    source_event_id: 'x',
    source_url: 'https://example.test',
    title: 'Near Caracas',
    place: 'Near Caracas',
    event_time: '2026-06-24T22:05:05.000Z',
    magnitude: 4.8,
    coords_lat: 10.5,
    coords_lng: -66.0,
    ...over
  };
}

test('loadSeismicSnapshot dedupes cross-source duplicates and drops foreign events', async () => {
  // Fuentes de fixture inyectadas: nada de red.
  const usgs: SeismicSourceAdapter = {
    source: 'usgs',
    fetcher: async () => [
      quake({ id: 'usgs-1', source: 'usgs', source_event_id: 'usgs-1' }),
      quake({
        id: 'usgs-col',
        source: 'usgs',
        source_event_id: 'col',
        place: 'Colombia, frontera',
        coords_lat: 8,
        coords_lng: -72
      })
    ]
  };
  const emsc: SeismicSourceAdapter = {
    source: 'emsc',
    // mismo origen-tiempo y epicentro que usgs-1, magnitud apenas distinta: es el mismo sismo.
    fetcher: async () => [quake({ id: 'emsc-1', source: 'emsc', source_event_id: 'emsc-1', magnitude: 4.9 })]
  };

  const snap = await loadSeismicSnapshot(24, 1.0, [usgs, emsc]);

  assert.equal(snap.degraded, false);
  // El duplicado cross-source se fusiona (1) y el evento de Colombia se filtra por frontera.
  assert.equal(snap.events.length, 1);
  assert.ok(snap.events.every((e) => !/colombia/i.test(e.place)));
});

test('loadSeismicSnapshot reports degraded when every source fails', async () => {
  const broken: SeismicSourceAdapter = {
    source: 'usgs',
    fetcher: async () => {
      throw new Error('network down');
    }
  };
  const snap = await loadSeismicSnapshot(24, 1.0, [broken]);
  assert.equal(snap.degraded, true);
});
