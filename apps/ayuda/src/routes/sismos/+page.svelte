<script lang="ts">
  import MapLibreMap from '$lib/components/MapLibreMap.svelte';

  export let data: {
    events: Array<{
      id: string;
      source: string;
      source_url: string;
      title: string;
      place: string;
      event_time: string;
      magnitude: number;
      magnitude_type?: string;
      depth_km?: number;
      coords_lat: number;
      coords_lng: number;
      alert_level?: string;
      event_class?: string;
    }>;
    snapshot: {
      lastSuccessfulAt: string | null;
      source: string;
      sourcesChecked: Array<{
        source: string;
        ok: boolean;
        count: number;
      }>;
      degraded: boolean;
    };
    filters: {
      window: string;
      minMagnitude: number;
      search: string;
    };
  };

  const windows = [
    { label: '1h', value: '1h' },
    { label: '6h', value: '6h' },
    { label: '24h', value: '24h' },
    { label: '7d recientes', value: '7d' },
    { label: '30d recientes', value: '30d' }
  ];

  const magnitudes = [0, 1, 2, 3, 4];
  const mapModes: Array<'positron'> = ['positron'];
  let selectedEventId: string | null = null;
  let mapComponent: any;

  function sourceLabel(source: string): string {
    if (source === 'multiple') return 'Múltiples fuentes';
    if (source === 'cached') return 'Cache local';
    if (source === 'emsc') return 'EMSC';
    if (source === 'usgs') return 'USGS';
    if (source === 'geofon') return 'GEOFON';
    if (source === 'funvisis') return 'FUNVISIS';
    return source.toUpperCase();
  }

  // Descripción legible del tipo de magnitud (Mww, mb, ml…) para tooltip.
  function magnitudeTypeTitle(type?: string): string {
    const descriptions: Record<string, string> = {
      mww: 'Magnitud de momento (W-phase): la más fiable, basada en la energía liberada. Usada para sismos fuertes.',
      mw: 'Magnitud de momento: basada en la energía liberada por el sismo.',
      mwc: 'Magnitud de momento (centroide).',
      mwb: 'Magnitud de momento (ondas de cuerpo).',
      mb: 'Magnitud de ondas de cuerpo (ondas P): útil para sismos pequeños o lejanos; subestima los grandes.',
      mblg: 'Magnitud de ondas Lg (regional).',
      ml: 'Magnitud local (escala de Richter): para sismos cercanos.',
      ms: 'Magnitud de ondas superficiales.',
      md: 'Magnitud de duración (a partir de la duración de la señal).'
    };
    return descriptions[(type ?? '').toLowerCase()] ?? 'Tipo de magnitud reportado por la fuente.';
  }

  function scrollBehavior(): ScrollBehavior {
    return typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
  }

  // Lista → mapa: enfoca el marcador (imperativo, idempotente) y trae el mapa al viewport.
  function focusEvent(eventId: string) {
    selectedEventId = eventId;
    mapComponent?.focus(eventId);
    document.getElementById('mapa-sismos')?.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
  }

  // Mapa → lista: solo resalta la card del marcador clicado. NO se desplaza la página:
  // la vista permanece en el mapa.
  function handleMarkerSelect(event: CustomEvent<{ id: string }>) {
    selectedEventId = event.detail.id;
  }

  $: markers = data.events.map((event) => ({
    id: event.id,
    lat: event.coords_lat,
    lng: event.coords_lng,
    label: `${event.magnitude.toFixed(1)} · ${event.place}`,
    popup: `<dl class="map-popup-list"><div><dt>Magnitud</dt><dd>${event.magnitude.toFixed(1)} ${event.magnitude_type ?? 'mag'}</dd></div><div><dt>Fecha</dt><dd>${new Date(event.event_time).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</dd></div><div><dt>Profundidad</dt><dd>${event.depth_km ?? 'N/D'} km</dd></div></dl><a class="map-popup-link" href="${event.source_url}" target="_blank" rel="noreferrer">Abrir fuente</a>`,
    magnitude: event.magnitude,
    color: event.magnitude >= 6.5 ? '#ff3300' : event.magnitude >= 5.0 ? '#ff8800' : event.magnitude >= 4.0 ? '#ffcc00' : '#00cc66'
  }));
</script>

<svelte:head>
  <title>Sismos | Sismo VE</title>
  <meta name="description" content="Eventos sísmicos recientes para Venezuela con filtros, lista y mapa." />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">MONITOREO SÍSMICO</p>
  <h1 class="page-title">Sismos recientes</h1>
  <p class="page-lead">
    Eventos recientes de Venezuela con filtros por ventana y magnitud. Las réplicas
    pequeñas se mantienen visibles por defecto.
  </p>
</section>

<form method="GET" class="toolbar" aria-label="Filtros de búsqueda">
  <div style="flex: 1 1 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--line-soft); padding-bottom: 1rem; margin-bottom: 0.25rem;">
    <h2 class="panel__title" style="display: flex; align-items: center; gap: 0.65rem; margin: 0;">
      <span class="material-symbols-outlined" aria-hidden="true" style="color: var(--yellow);">tune</span>
      Filtros
    </h2>
    <span class="panel__meta">Opciones de búsqueda</span>
  </div>

  <label class="field" style="flex: 1 1 14rem;">
    <span class="field__label">Ventana temporal</span>
    <select class="field__select" name="window">
      {#each windows as window}
        <option value={window.value} selected={window.value === data.filters.window}>
          {window.label}
        </option>
      {/each}
    </select>
  </label>
  <label class="field" style="flex: 1 1 14rem;">
    <span class="field__label">Magnitud mínima</span>
    <select class="field__select" name="minMagnitude">
      {#each magnitudes as magnitude}
        <option value={magnitude} selected={magnitude === data.filters.minMagnitude}>
          {`M ${magnitude}+`}
        </option>
      {/each}
    </select>
  </label>
  <div class="toolbar__actions">
    <button class="button-brutal" type="submit">
      <span class="material-symbols-outlined" aria-hidden="true" style="font-size: 1.25rem;">search</span>
      Aplicar
    </button>
  </div>
</form>

<section class="map-layout">
  <MapLibreMap
    bind:this={mapComponent}
    title="Mapa de eventos"
    headingId="mapa-sismos"
    description="Los marcadores se escalan por magnitud y se mantienen visibles los eventos pequeños."
    {markers}
    modes={mapModes}
    selectedMarkerId={selectedEventId}
    on:select={handleMarkerSelect}
    loaderLabel="Cargando mapa"
    loaderSublabel="Eventos sísmicos en Venezuela"
    emptyLabel="No hay eventos filtrados para mostrar."
  />

  <aside class="split-panel" aria-label="Resumen sísmico">
    <div class="split-panel__head">
      <h2 class="panel__title">Telemetría</h2>
      <span class="status-chip" class:status-chip--warning={data.snapshot.degraded}>
        {data.snapshot.degraded ? 'Degradado' : 'Activo'}
      </span>
    </div>
    <div class="stat-grid">
      <div class="stat-tile">
        <span class="material-symbols-outlined stat-tile__icon" aria-hidden="true">sensors</span>
        <strong>{data.events.length}</strong>
        <span>Eventos filtrados</span>
      </div>
      <div class="stat-tile">
        <span class="material-symbols-outlined stat-tile__icon" aria-hidden="true">speed</span>
        <strong>M {data.filters.minMagnitude}+</strong>
        <span>Magnitud mínima</span>
      </div>
    </div>
    <p class="muted-note">
      Fuente: {sourceLabel(data.snapshot.source)}.
      Ventana activa: {data.filters.window}. Este módulo normaliza eventos recientes y no
      representa predicción sísmica.
    </p>
    <div class="source-list" aria-label="Fuentes consultadas">
      {#each data.snapshot.sourcesChecked as source}
        <span class:source-list__item--warning={!source.ok}>
          {sourceLabel(source.source)} · {source.ok ? `${source.count} eventos` : 'sin respuesta'}
        </span>
      {/each}
    </div>

    <details class="seismo-legend">
      <summary>¿Qué significan Mww, mb y HLV?</summary>
      <dl>
        <div>
          <dt>Mww · Mw</dt>
          <dd>Magnitud de momento: la más precisa, basada en la energía liberada. Se usa para sismos fuertes.</dd>
        </div>
        <div>
          <dt>mb</dt>
          <dd>Magnitud de ondas de cuerpo (ondas P): útil para sismos pequeños o lejanos; subestima los grandes.</dd>
        </div>
        <div>
          <dt>ml</dt>
          <dd>Magnitud local (escala de Richter): para sismos cercanos.</dd>
        </div>
        <div>
          <dt>HLV</dt>
          <dd>Hora Legal de Venezuela (UTC−4), la hora oficial del país.</dd>
        </div>
      </dl>
    </details>
  </aside>
</section>

<section class="panel">
  <div class="stat-strip">
    <span>Lista de eventos</span>
    <span class="panel__meta">
      {data.snapshot.degraded
        ? 'Modo degradado'
        : `Fuente: ${sourceLabel(data.snapshot.source)} · ${data.filters.window}`}
    </span>
  </div>

  {#if data.snapshot.degraded}
    <div class="empty-state empty-state--accent">
      No se pudo alcanzar el origen. Se muestra la última respuesta exitosa cuando existe.
    </div>
  {/if}

  {#if data.snapshot.lastSuccessfulAt}
    <div class="surface">
      <p class="muted-note">
        Última respuesta exitosa: {new Date(data.snapshot.lastSuccessfulAt).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}
      </p>
    </div>
  {/if}

  {#if data.events.length > 0}
    <div class="quake-grid">
      {#each data.events as event}
        <article
          class="quake-card"
          class:quake-card--active={selectedEventId === event.id}
          id={`quake-card-${event.id}`}
          aria-current={selectedEventId === event.id ? 'true' : undefined}
        >
          <div class="quake-card__status">
            {sourceLabel(event.source)}
          </div>
          <div class="quake-card__mag">
            <span style="color: {event.magnitude >= 6.5 ? '#ff3300' : event.magnitude >= 5.0 ? '#ff8800' : event.magnitude >= 4.0 ? '#ffcc00' : '#00cc66'};">
              {event.magnitude.toFixed(1)}
            </span>
            <small title={magnitudeTypeTitle(event.magnitude_type)}>{event.magnitude_type ?? 'mag'}</small>
          </div>
          <h3>{event.place}</h3>
          <div class="quake-card__metrics">
            <div>
              <span>Fecha</span>
              <strong>{new Date(event.event_time).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}</strong>
            </div>
            <div>
              <span title="Hora Legal de Venezuela (UTC−4)">Hora (HLV)</span>
              <strong>{new Date(event.event_time).toLocaleTimeString('es-VE', { timeZone: 'America/Caracas' })}</strong>
            </div>
            <div>
              <span>Profundidad</span>
              <strong>{event.depth_km ?? 'N/D'} km</strong>
            </div>
          </div>
          <div class="quake-card__actions">
            <button class="button-brutal" type="button" on:click={() => focusEvent(event.id)}>
              <span class="material-symbols-outlined" aria-hidden="true" style="font-size: 1.25rem;">location_on</span>
              Marcar en mapa
            </button>
            <a class="button-brutal button-brutal--ghost" href={event.source_url} target="_blank" rel="noreferrer">
              Abrir fuente
            </a>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <section class="empty-state empty-state--accent">
      No hay eventos filtrados en este momento.
    </section>
  {/if}
</section>

<style>
  .seismo-legend {
    margin-top: 1rem;
    border: 1px solid var(--line-soft);
    background: #1b1a1a;
  }

  .seismo-legend > summary {
    cursor: pointer;
    padding: 0.6rem 0.75rem;
    min-height: 44px;
    display: flex;
    align-items: center;
    font-family: var(--mono);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--yellow);
  }

  .seismo-legend[open] > summary {
    border-bottom: 1px solid var(--line-soft);
  }

  .seismo-legend dl {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding: 0.75rem;
  }

  .seismo-legend dl div {
    display: grid;
    gap: 0.15rem;
  }

  .seismo-legend dt {
    font-family: var(--mono);
    font-size: 0.74rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #f4f4f4;
  }

  .seismo-legend dd {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--text-muted, #b9b9b9);
  }

  .quake-card--active {
    border-color: var(--yellow);
    box-shadow: 0 0 0 2px var(--yellow), 0 0 18px rgba(255, 204, 0, 0.25);
  }

  @media (prefers-reduced-motion: reduce) {
    .quake-card--active {
      box-shadow: 0 0 0 2px var(--yellow);
    }
  }
</style>
