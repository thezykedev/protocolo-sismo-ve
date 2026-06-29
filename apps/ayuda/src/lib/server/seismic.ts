import type { AlertLevel, SeismicEvent, SeismicSource } from '@sismo-ve/schemas';
import { eventClassFromMagnitude, normalizeWhitespace } from '@sismo-ve/schemas';

const VENEZUELA_BBOX = {
  minlatitude: '0.5',
  maxlatitude: '12.8',
  minlongitude: '-74.0',
  maxlongitude: '-59.6'
};

const DEFAULT_QUERY = {
  format: 'geojson',
  minmagnitude: '1.0',
  orderby: 'time',
  ...VENEZUELA_BBOX
};

const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const EMSC_URL = 'https://www.seismicportal.eu/fdsnws/event/1/query';
const EMSC_EVENT_URL = 'https://www.emsc.eu/Earthquake/earthquake.php';
const GEOFON_URL = 'https://geofon.gfz-potsdam.de/fdsnws/event/1/query';
const GEOFON_EVENT_URL = 'https://geofon.gfz-potsdam.de/eqinfo/event.php';

declare global {
  // eslint-disable-next-line no-var
  var __sismoVeSeismicCache:
    | {
        events: SeismicEvent[];
        lastSuccessfulAt: string;
        source: SeismicSnapshot['source'];
      }
    | undefined;
}

function alertFromMagnitude(magnitude: number): AlertLevel {
  if (!Number.isFinite(magnitude)) return 'unknown';
  if (magnitude >= 6.5) return 'red';
  if (magnitude >= 5.0) return 'orange';
  if (magnitude >= 4.0) return 'yellow';
  return 'green';
}

function dedupeEvents(events: SeismicEvent[]): SeismicEvent[] {
  const unique: SeismicEvent[] = [];

  for (const event of events) {
    const duplicateIndex = unique.findIndex((current) => sameSeismicEvent(current, event));
    if (duplicateIndex === -1) {
      unique.push(event);
    } else if (eventDetailScore(event) > eventDetailScore(unique[duplicateIndex])) {
      unique[duplicateIndex] = event;
    }
  }

  return unique.sort((a, b) => b.event_time.localeCompare(a.event_time));
}

function sameSeismicEvent(a: SeismicEvent, b: SeismicEvent): boolean {
  // El mismo sismo reportado por varias agencias comparte el instante de origen
  // (segundos de diferencia) aunque discrepe en magnitud y epicentro. Un doblete
  // (p. ej. 7.2 y 7.5 separados ~39 s) son rupturas distintas: la ventana corta de
  // tiempo evita fusionarlas, mientras la tolerancia amplia de magnitud y distancia
  // sí deduplica el mismo evento estimado de forma diferente entre fuentes.
  const timeDeltaSeconds = Math.abs(new Date(a.event_time).getTime() - new Date(b.event_time).getTime()) / 1000;
  const magnitudeDelta = Math.abs(a.magnitude - b.magnitude);
  // El tiempo de origen es el discriminador fiable: una misma ruptura vista por varias
  // agencias coincide en segundos aunque su epicentro estimado disperse >150 km. Por eso
  // la ventana de tiempo es estrecha (20 s, separa el doblete de 39 s) y la de distancia
  // amplia (200 km, absorbe esa dispersión). La magnitud solo es cota de cordura.
  return timeDeltaSeconds <= 20 && magnitudeDelta <= 2.0 && distanceKm(a, b) <= 200;
}

function distanceKm(a: SeismicEvent, b: SeismicEvent): number {
  const radiusKm = 6371;
  const lat1 = (a.coords_lat * Math.PI) / 180;
  const lat2 = (b.coords_lat * Math.PI) / 180;
  const deltaLat = ((b.coords_lat - a.coords_lat) * Math.PI) / 180;
  const deltaLng = ((b.coords_lng - a.coords_lng) * Math.PI) / 180;
  const h =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function eventDetailScore(event: SeismicEvent): number {
  let score = 0;
  if (event.source === 'usgs') score += 4;
  if (event.source === 'emsc') score += 3;
  if (event.source === 'geofon') score += 2;
  if (event.review_status === 'reviewed') score += 6;
  if (event.felt_reports_count) score += Math.min(event.felt_reports_count, 50) / 10;
  if (event.updated_at_source) score += 1;
  if (event.magnitude_type) score += 1;
  if (typeof event.depth_km === 'number') score += 1;
  if (event.source_url) score += 1;
  if (event.place && !/evento sísmico/i.test(event.place)) score += 1;
  return score;
}

function normalisePlace(place: string): string {
  return normalizeWhitespace(place).replace(/^,|,$/g, '');
}

function sourceLabel(source: SeismicSource): string {
  if (source === 'emsc') return 'EMSC';
  if (source === 'usgs') return 'USGS';
  if (source === 'funvisis') return 'FUNVISIS';
  if (source === 'sgc') return 'SGC Colombia';
  return source.toUpperCase();
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
    magnitude,
    magnitude_type: feature?.properties?.magType ?? undefined,
    depth_km: Number(coordinates[2] ?? 0),
    coords_lat: Number(coordinates[1]),
    coords_lng: Number(coordinates[0]),
    felt_reports_count: Number.isFinite(Number(feature?.properties?.felt)) ? Number(feature.properties.felt) : undefined,
    alert_level: alertFromMagnitude(magnitude),
    event_class: eventClassFromMagnitude(magnitude),
    mainshock_candidate: magnitude >= 4.5,
    review_status: feature?.properties?.status === 'reviewed' ? 'reviewed' : 'automatic',
    updated_at_source: feature?.properties?.updated ? new Date(feature.properties.updated).toISOString() : undefined
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

function mapEMSCFeature(feature: any): SeismicEvent | null {
  const properties = feature?.properties ?? feature;
  const coordinates = feature?.geometry?.coordinates;
  const magnitude = Number(properties?.mag);
  // Proteger el parseo: un `time` no parseable haría que toISOString() lance RangeError y tumbe
  // TODA la fuente EMSC (no solo esa fila). Validar antes, igual que GEOFON.
  const parsedTime = properties?.time ? new Date(properties.time) : null;
  const eventTime = parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime.toISOString() : null;
  const lat = Number(properties?.lat ?? coordinates?.[1]);
  const lng = Number(properties?.lon ?? coordinates?.[0]);
  if (!Number.isFinite(magnitude) || !Number.isFinite(lat) || !Number.isFinite(lng) || !eventTime) {
    return null;
  }

  const sourceEventId = String(properties?.source_id ?? properties?.unid ?? feature?.id ?? `${eventTime}-${magnitude}`);
  const sourceUrl = new URL(EMSC_EVENT_URL);
  sourceUrl.searchParams.set('id', sourceEventId);
  const place = normalisePlace(
    String(properties?.flynn_region ?? properties?.region ?? properties?.place ?? 'Evento sísmico')
  );

  return {
    id: `emsc-${sourceEventId}`,
    status: 'active',
    source: 'emsc',
    source_event_id: sourceEventId,
    source_url: sourceUrl.toString(),
    title: place,
    place,
    state_region: place,
    event_time: eventTime,
    updated_at_source: properties?.lastupdate ? new Date(properties.lastupdate).toISOString() : undefined,
    magnitude,
    magnitude_type: properties?.magtype ?? undefined,
    depth_km: Number(properties?.depth ?? Math.abs(Number(coordinates?.[2] ?? 0))),
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
  url.searchParams.set('starttime', start);
  url.searchParams.set('orderby', 'time');
  url.searchParams.set('limit', '500');
  url.searchParams.set('minlatitude', VENEZUELA_BBOX.minlatitude);
  url.searchParams.set('maxlatitude', VENEZUELA_BBOX.maxlatitude);
  url.searchParams.set('minlongitude', VENEZUELA_BBOX.minlongitude);
  url.searchParams.set('maxlongitude', VENEZUELA_BBOX.maxlongitude);
  url.searchParams.set('minmagnitude', String(minMagnitude));

  const response = await fetch(url);
  if (response.status === 204) return [];
  if (!response.ok) {
    throw new Error(`EMSC responded ${response.status}`);
  }

  const payload = await response.json();
  const features = Array.isArray(payload?.features)
    ? payload.features
    : Array.isArray(payload?.events)
      ? payload.events
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
  return features.map(mapEMSCFeature).filter(Boolean) as SeismicEvent[];
}

export function mapGEOFONRow(row: string): SeismicEvent | null {
  const columns = row.split('|').map((column) => column.trim());
  // La salida FDSN-text de GEOFON encabeza con "#EventID|Time|..."; descartar la
  // cabecera y comentarios evita parsear "Time" como fecha (RangeError) y tumbar la fuente.
  if (columns.length < 13 || columns[0].startsWith('#')) return null;

  const [eventId, time, latitude, longitude, depth, author, catalog, contributor, contributorId, magType, magnitude, magAuthor, place] =
    columns;
  // GEOFON emite el tiempo FDSN sin designador de zona (p. ej. "2026-06-24T22:05:05.56").
  // Sin la 'Z', new Date() lo interpreta como hora local del servidor y desfasa el evento
  // según el huso del host. Los tiempos FDSN son UTC: forzar 'Z' cuando falta la zona.
  const utcTime = time && !/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(time) ? `${time}Z` : time;
  const parsedTime = utcTime ? new Date(utcTime) : null;
  const eventTime = parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime.toISOString() : null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  const depthKm = Number(depth);
  const mag = Number(magnitude);
  if (!eventTime || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(mag)) {
    return null;
  }

  const sourceEventId = eventId || contributorId || `${eventTime}-${mag}`;
  const sourceUrl = new URL(GEOFON_EVENT_URL);
  sourceUrl.searchParams.set('id', sourceEventId);
  const normalizedPlace = normalisePlace(place || catalog || contributor || author || 'Evento sísmico');

  return {
    id: `geofon-${sourceEventId}`,
    status: 'active',
    source: 'geofon',
    source_event_id: sourceEventId,
    source_url: sourceUrl.toString(),
    title: normalizedPlace,
    place: normalizedPlace,
    state_region: normalizedPlace,
    event_time: eventTime,
    magnitude: mag,
    magnitude_type: magType || undefined,
    depth_km: Number.isFinite(depthKm) ? depthKm : undefined,
    coords_lat: lat,
    coords_lng: lng,
    alert_level: alertFromMagnitude(mag),
    event_class: eventClassFromMagnitude(mag),
    mainshock_candidate: mag >= 4.5,
    review_status: 'automatic'
  };
}

async function fetchGEOFON(hours: number, minMagnitude: number): Promise<SeismicEvent[]> {
  const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const url = new URL(GEOFON_URL);
  url.searchParams.set('format', 'text');
  url.searchParams.set('starttime', start);
  url.searchParams.set('orderby', 'time');
  url.searchParams.set('limit', '100');
  url.searchParams.set('minlatitude', VENEZUELA_BBOX.minlatitude);
  url.searchParams.set('maxlatitude', VENEZUELA_BBOX.maxlatitude);
  url.searchParams.set('minlongitude', VENEZUELA_BBOX.minlongitude);
  url.searchParams.set('maxlongitude', VENEZUELA_BBOX.maxlongitude);
  url.searchParams.set('minmagnitude', String(minMagnitude));

  const response = await fetch(url);
  if (response.status === 204) return [];
  if (!response.ok) {
    throw new Error(`GEOFON responded ${response.status}`);
  }

  const payload = await response.text();
  return payload
    .split(/\r?\n/)
    .map(mapGEOFONRow)
    .filter(Boolean) as SeismicEvent[];
}

function mapSGCFeature(feature: any): SeismicEvent | null {
  const magnitude = Number(feature?.magnitud ?? feature?.mag);
  const lat = Number(feature?.latitud ?? feature?.lat);
  const lng = Number(feature?.longitud ?? feature?.lon);
  const eventTime = feature?.fecha_corte ?? feature?.fecha ?? feature?.time ?? feature?.Fecha;
  
  if (!Number.isFinite(magnitude) || !Number.isFinite(lat) || !Number.isFinite(lng) || !eventTime) {
    return null;
  }
  
  const isoTime = new Date(eventTime).toISOString();
  const sourceEventId = String(feature?.id_evento ?? feature?.id ?? `${isoTime}-${magnitude}`);
  const place = normalisePlace(
    String(feature?.municipio ? `${feature.municipio}, ${feature.departamento ?? ''}` : (feature?.region ?? 'Evento sísmico Frontera'))
  );

  return {
    id: `sgc-${sourceEventId}`,
    status: 'active',
    source: 'sgc',
    source_event_id: sourceEventId,
    source_url: 'https://sgc.gov.co/sismos',
    title: place,
    place,
    state_region: place,
    event_time: isoTime,
    magnitude,
    magnitude_type: feature?.tipo_magnitud ?? undefined,
    depth_km: Number(feature?.profundidad ?? feature?.depth ?? 0),
    coords_lat: lat,
    coords_lng: lng,
    alert_level: alertFromMagnitude(magnitude),
    event_class: eventClassFromMagnitude(magnitude),
    mainshock_candidate: magnitude >= 4.5,
    review_status: feature?.estado === 'Revisado' ? 'reviewed' : 'automatic'
  };
}

async function fetchSGC(hours: number, minMagnitude: number): Promise<SeismicEvent[]> {
  const url = 'https://api.sgc.gov.co/sismos/ultimos-sismos';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.sgc.gov.co/sismos'
      }
    });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    const data = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
    
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).getTime();
    
    return data
      .map(mapSGCFeature)
      .filter((e: SeismicEvent | null): e is SeismicEvent =>
        e !== null && 
        e.magnitude >= minMagnitude && 
        new Date(e.event_time).getTime() >= cutoff
      );
  } catch (error) {
    return [];
  }
}

export interface SeismicSnapshot {
  events: SeismicEvent[];
  lastSuccessfulAt: string | null;
  source: SeismicSource | 'multiple' | 'cached';
  sourcesChecked: Array<{
    source: SeismicSource;
    ok: boolean;
    count: number;
  }>;
  degraded: boolean;
}

function isForeignEvent(place: string): boolean {
  const p = place.toLowerCase();
  const foreignTerms = [
    'colombia',
    'trinidad',
    'tobago',
    'guyana',
    'brazil',
    'brasil',
    'grenada',
    'barbados',
    'vincent',
    'aruba',
    'curacao',
    'curaçao',
    'bonaire',
    'panama',
    'panamá',
    'puerto rico',
    'martinique',
    'lucia'
  ];
  return foreignTerms.some((term) => p.includes(term));
}

export interface SeismicSourceAdapter {
  source: SeismicSource;
  fetcher: () => Promise<SeismicEvent[]>;
}

// Fuentes por defecto en producción. SGC (fetchSGC/mapSGCFeature) está implementado pero NO
// se cablea aquí: cablearlo + ajustar isForeignEvent para la frontera es una decisión de
// producto pendiente sobre la cobertura de eventos fronterizos (ver review, candidato #4).
function defaultSeismicSources(hours: number, minMagnitude: number): SeismicSourceAdapter[] {
  return [
    { source: 'emsc', fetcher: () => fetchEMSC(hours, minMagnitude) },
    { source: 'usgs', fetcher: () => fetchUSGS(hours, minMagnitude) },
    { source: 'geofon', fetcher: () => fetchGEOFON(hours, minMagnitude) }
  ];
}

// `sources` es inyectable: en producción usa las fuentes reales (red); en pruebas se pasan
// adaptadores de fixtures, de modo que la dedupe/normalización/filtro fronterizo se ejercitan
// a través de la interfaz, sin mockear fetch global.
export async function loadSeismicSnapshot(
  hours: number,
  minMagnitude: number,
  sources: SeismicSourceAdapter[] = defaultSeismicSources(hours, minMagnitude)
): Promise<SeismicSnapshot> {
  const settled = await Promise.allSettled(sources.map((source) => source.fetcher()));
  const sourcesChecked = settled.map((result, index) => ({
    source: sources[index].source,
    ok: result.status === 'fulfilled',
    count: result.status === 'fulfilled' ? result.value.length : 0
  }));

  const successfulEvents = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  if (sourcesChecked.some((source) => source.ok)) {
    const events = dedupeEvents(successfulEvents).filter(e => !isForeignEvent(e.place));
    const lastSuccessfulAt = new Date().toISOString();
    const successfulSources = sourcesChecked.filter((source) => source.ok && source.count > 0).map((source) => source.source);
    const snapshotSource: SeismicSnapshot['source'] =
      successfulSources.length > 1 ? 'multiple' : successfulSources[0] ?? sourcesChecked.find((source) => source.ok)?.source ?? 'manual';

    globalThis.__sismoVeSeismicCache = {
      events,
      lastSuccessfulAt,
      source: snapshotSource
    };

    return {
      events,
      lastSuccessfulAt,
      source: snapshotSource,
      sourcesChecked,
      degraded: false
    };
  }

  const cached = globalThis.__sismoVeSeismicCache;
  return {
    events: cached?.events ?? [],
    lastSuccessfulAt: cached?.lastSuccessfulAt ?? null,
    source: cached?.source ?? 'cached',
    sourcesChecked,
    degraded: true
  };
}

export function formatSeismicSource(source: SeismicSnapshot['source']): string {
  if (source === 'multiple') return 'Múltiples fuentes';
  if (source === 'cached') return 'Cache local';
  return sourceLabel(source);
}
