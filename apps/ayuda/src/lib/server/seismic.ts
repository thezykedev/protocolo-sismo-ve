import type { AlertLevel, EventClass, SeismicEvent, SeismicSource } from '@sismo-ve/schemas';
import { eventClassFromMagnitude, normalizeWhitespace } from '@sismo-ve/schemas';

const VENEZUELA_BBOX = {
  minlatitude: '0.5',
  maxlatitude: '13.8',
  minlongitude: '-74.8',
  maxlongitude: '-58.0'
};

const DEFAULT_QUERY = {
  format: 'geojson',
  minmagnitude: '1.0',
  orderby: 'time',
  ...VENEZUELA_BBOX
};

const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const EMSC_URL = 'https://www.seismicportal.eu/fdsnws/event/1/query';

declare global {
  // eslint-disable-next-line no-var
  var __sismoVeSeismicCache:
    | {
        events: SeismicEvent[];
        lastSuccessfulAt: string;
        source: SeismicSource;
      }
    | undefined;
}

function alertFromMagnitude(magnitude: number): AlertLevel {
  if (!Number.isFinite(magnitude)) return 'unknown';
  if (magnitude >= 6) return 'red';
  if (magnitude >= 5) return 'orange';
  if (magnitude >= 4) return 'yellow';
  return 'green';
}

function dedupeEvents(events: SeismicEvent[]): SeismicEvent[] {
  const seen = new Map<string, SeismicEvent>();

  for (const event of events) {
    const key = [
      event.source,
      event.source_event_id,
      event.event_time.slice(0, 16),
      event.coords_lat.toFixed(2),
      event.coords_lng.toFixed(2),
      event.magnitude.toFixed(1)
    ].join('|');

    if (!seen.has(key)) {
      seen.set(key, event);
    }
  }

  return [...seen.values()].sort((a, b) => b.event_time.localeCompare(a.event_time));
}

function normalisePlace(place: string): string {
  return normalizeWhitespace(place).replace(/^,|,$/g, '');
}

function mapUSGSFeature(feature: any): SeismicEvent | null {
  const magnitude = Number(feature?.properties?.mag);
  const coordinates = feature?.geometry?.coordinates;
  if (!Number.isFinite(magnitude) || !Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const eventTime = feature?.properties?.time ? new Date(feature.properties.time).toISOString() : null;
  if (!eventTime) return null;

  const place = normalisePlace(String(feature?.properties?.place ?? 'Evento sísmico'));

  return {
    id: `usgs-${feature?.id ?? `${eventTime}-${magnitude}`}`,
    status: 'active',
    source: 'usgs',
    source_event_id: String(feature?.id ?? `${eventTime}-${magnitude}`),
    source_url: String(feature?.properties?.url ?? 'https://earthquake.usgs.gov'),
    title: place,
    place,
    state_region: place,
    event_time: eventTime,
    updated_at_source: feature?.properties?.updated ? new Date(feature.properties.updated).toISOString() : undefined,
    magnitude,
    magnitude_type: feature?.properties?.magType ?? undefined,
    depth_km: Number(coordinates[2] ?? 0),
    coords_lat: Number(coordinates[1]),
    coords_lng: Number(coordinates[0]),
    alert_level: alertFromMagnitude(magnitude),
    event_class: eventClassFromMagnitude(magnitude),
    mainshock_candidate: magnitude >= 4.5,
    review_status: 'automatic'
  };
}

async function fetchUSGS(hours: number, minMagnitude: number): Promise<SeismicEvent[]> {
  const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const url = new URL(USGS_URL);
  const params = {
    ...DEFAULT_QUERY,
    starttime: start,
    minmagnitude: String(minMagnitude)
  };

  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS responded ${response.status}`);
  }

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];
  return features.map(mapUSGSFeature).filter(Boolean) as SeismicEvent[];
}

function mapEMSCEvent(event: any): SeismicEvent | null {
  const magnitude = Number(event?.mag);
  const eventTime = event?.time ? new Date(event.time).toISOString() : null;
  const lat = Number(event?.lat);
  const lng = Number(event?.lon);
  if (!Number.isFinite(magnitude) || !Number.isFinite(lat) || !Number.isFinite(lng) || !eventTime) {
    return null;
  }

  const place = normalisePlace(String(event?.flynn_region ?? event?.region ?? event?.place ?? 'Evento sísmico'));

  return {
    id: `emsc-${event?.id ?? `${eventTime}-${magnitude}`}`,
    status: 'active',
    source: 'emsc',
    source_event_id: String(event?.id ?? `${eventTime}-${magnitude}`),
    source_url: String(event?.url ?? 'https://www.seismicportal.eu'),
    title: place,
    place,
    state_region: place,
    event_time: eventTime,
    updated_at_source: event?.update_time ? new Date(event.update_time).toISOString() : undefined,
    magnitude,
    magnitude_type: event?.magtype ?? undefined,
    depth_km: Number(event?.depth ?? 0),
    coords_lat: lat,
    coords_lng: lng,
    alert_level: alertFromMagnitude(magnitude),
    event_class: eventClassFromMagnitude(magnitude),
    mainshock_candidate: magnitude >= 4.5,
    review_status: 'automatic'
  };
}

async function fetchEMSC(hours: number, minMagnitude: number): Promise<SeismicEvent[]> {
  const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const url = new URL(EMSC_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('start', start);
  url.searchParams.set('minlat', VENEZUELA_BBOX.minlatitude);
  url.searchParams.set('maxlat', VENEZUELA_BBOX.maxlatitude);
  url.searchParams.set('minlon', VENEZUELA_BBOX.minlongitude);
  url.searchParams.set('maxlon', VENEZUELA_BBOX.maxlongitude);
  url.searchParams.set('minmag', String(minMagnitude));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`EMSC responded ${response.status}`);
  }

  const payload = await response.json();
  const events = Array.isArray(payload?.events) ? payload.events : Array.isArray(payload?.data) ? payload.data : [];
  return events.map(mapEMSCEvent).filter(Boolean) as SeismicEvent[];
}

export interface SeismicSnapshot {
  events: SeismicEvent[];
  lastSuccessfulAt: string | null;
  source: SeismicSource | 'cached';
  degraded: boolean;
}

export async function loadSeismicSnapshot(hours: number, minMagnitude: number): Promise<SeismicSnapshot> {
  try {
    const events = dedupeEvents(await fetchUSGS(hours, minMagnitude));
    const lastSuccessfulAt = new Date().toISOString();
    globalThis.__sismoVeSeismicCache = {
      events,
      lastSuccessfulAt,
      source: 'usgs'
    };

    return {
      events,
      lastSuccessfulAt,
      source: 'usgs',
      degraded: false
    };
  } catch (usgsError) {
    try {
      const events = dedupeEvents(await fetchEMSC(hours, minMagnitude));
      const lastSuccessfulAt = new Date().toISOString();
      globalThis.__sismoVeSeismicCache = {
        events,
        lastSuccessfulAt,
        source: 'emsc'
      };

      return {
        events,
        lastSuccessfulAt,
        source: 'emsc',
        degraded: false
      };
    } catch {
      const cached = globalThis.__sismoVeSeismicCache;
      return {
        events: cached?.events ?? [],
        lastSuccessfulAt: cached?.lastSuccessfulAt ?? null,
        source: cached?.source ?? 'cached',
        degraded: true
      };
    }
  }
}
