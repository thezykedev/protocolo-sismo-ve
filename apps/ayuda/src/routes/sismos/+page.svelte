<script lang="ts">
  import LeafletMap from '$lib/components/LeafletMap.svelte';

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
    { label: '7d', value: '7d' }
  ];

  const magnitudes = [0, 1, 2, 3, 4];

  $: markers = data.events.map((event) => ({
    lat: event.coords_lat,
    lng: event.coords_lng,
    label: `${event.magnitude.toFixed(1)} · ${event.place}`,
    popup: `${event.magnitude.toFixed(1)} ${event.magnitude_type ?? ''}<br />${new Date(event.event_time).toLocaleString('es-VE')}<br />Profundidad: ${event.depth_km ?? 'N/D'} km<br /><a href="${event.source_url}" target="_blank" rel="noreferrer">Fuente</a>`,
    magnitude: event.magnitude,
    color: event.magnitude >= 5 ? '#ff3300' : event.magnitude >= 4 ? '#ff6600' : '#ffff00'
  }));
</script>

<svelte:head>
  <title>Sismos | Sismo VE</title>
  <meta name="description" content="Eventos sísmicos recientes para Venezuela con filtros, lista y mapa." />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">MONITOREO SÍSMICO</p>
  <h1 class="page-title">Sismos</h1>
  <p class="page-lead">
    Este módulo consulta eventos recientes de Venezuela y mantiene visibles las réplicas pequeñas.
    No es un sistema de predicción.
  </p>
</section>

<section class="panel">
  <div class="panel__head">
    <h2 class="panel__title">Filtros</h2>
    <span class="panel__meta">Cache: no-cache, max-age=60</span>
  </div>
  <form method="GET" class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));">
    <label class="field">
      <span class="field__label">Ventana</span>
      <select class="field__select" name="window">
        {#each windows as window}
          <option value={window.value} selected={window.value === data.filters.window}>
            {window.label}
          </option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span class="field__label">Magnitud mínima</span>
      <select class="field__select" name="minMagnitude">
        {#each magnitudes as magnitude}
          <option value={magnitude} selected={magnitude === data.filters.minMagnitude}>
            {`M ${magnitude}+`}
          </option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span class="field__label">Estado o región</span>
      <input
        class="field__input"
        id="sismos-search"
        name="search"
        value={data.filters.search}
        placeholder="Caracas, Sucre, occidente, etc."
      />
      <span class="field__help">Filtra por texto de ubicación</span>
    </label>
    <button class="button-brutal" type="submit">Aplicar</button>
  </form>
</section>

<LeafletMap
  title="Mapa de eventos"
  headingId="mapa-sismos"
  description="Los marcadores se escalan por magnitud y se mantienen visibles los eventos pequeños."
  {markers}
  emptyLabel="No hay eventos filtrados para mostrar."
/>

<section class="panel">
  <div class="panel__head">
    <h2 class="panel__title">Lista de eventos</h2>
    <span class="panel__meta">
      {data.snapshot.degraded ? 'Modo degradado' : `Fuente: ${data.snapshot.source}`}
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
        Última respuesta exitosa: {new Date(data.snapshot.lastSuccessfulAt).toLocaleString('es-VE')}
      </p>
    </div>
  {/if}

  {#if data.events.length > 0}
    <div class="list-stack">
      {#each data.events as event}
        <article class="record-row">
          <div class="record-row__top">
            <h3 class="record-row__title">
              M {event.magnitude.toFixed(1)} · {event.place}
            </h3>
            <span class="record-row__meta">
              {new Date(event.event_time).toLocaleString('es-VE')} · {event.depth_km ?? 'N/D'} km
            </span>
          </div>
          <div class="record-row__body">
            <p>{event.source.toUpperCase()} · {event.event_class ?? 'unknown'} · {event.alert_level ?? 'unknown'}</p>
            <p>
              <a href={event.source_url} target="_blank" rel="noreferrer">Abrir fuente</a>
            </p>
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
