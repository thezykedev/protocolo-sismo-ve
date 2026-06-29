<script lang="ts">
  import MapLibreMap from '$lib/components/MapLibreMap.svelte';

  export let data: {
    centers: Array<{
      id: string;
      name: string;
      type: string;
      city: string;
      state: string;
      address?: string;
      coords_lat?: number;
      coords_lng?: number;
      needs?: string;
      schedule?: string;
      contact_public?: string;
      verification_status?: string;
    }>;
  };

  $: markers = data.centers
    .filter((center) => typeof center.coords_lat === 'number' && typeof center.coords_lng === 'number')
    .map((center) => ({
      lat: center.coords_lat as number,
      lng: center.coords_lng as number,
      label: center.name,
      popup: `<strong>${center.name}</strong><br />${center.city}, ${center.state}<br />${center.address ?? ''}`,
      magnitude: 1,
      color: '#ff6600'
    }));
</script>

<svelte:head>
  <title>Centros | Sismo VE</title>
  <meta name="description" content="Centros de acopio y apoyo con mapa MapLibre e información crowdsourced." />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">CENTROS DE APOYO</p>
  <h1 class="page-title">Mapa operativo<br />de centros</h1>
  <p class="page-lead">
    Centros de acopio, albergues y puntos logísticos con información de la comunidad (crowdsourced). El mapa muestra
    registros públicos.
  </p>
</section>

<section class="map-layout">
  <MapLibreMap
    title="Mapa de centros"
    headingId="mapa-centros"
    description="El mapa muestra registros aportados por la comunidad."
    {markers}
    loaderLabel="Cargando mapa"
    loaderSublabel="Acopio, refugios y atención gratuita"
    emptyLabel="No hay centros comunitarios para mostrar."
  />

  <aside class="split-panel" aria-label="Resumen de centros">
    <div class="split-panel__head">
      <h2 class="panel__title">Estado de red</h2>
      <span class="status-chip status-chip--quiet">Online</span>
    </div>
    <div class="stat-grid">
      <div class="stat-tile">
        <span class="material-symbols-outlined stat-tile__icon" aria-hidden="true">home_health</span>
        <strong>{data.centers.length}</strong>
        <span>Centros visibles</span>
      </div>
      <div class="stat-tile">
        <span class="material-symbols-outlined stat-tile__icon" aria-hidden="true">location_on</span>
        <strong>{markers.length}</strong>
        <span>Con coordenadas públicas</span>
      </div>
    </div>
    <p class="muted-note">
      Necesidades, horarios y contactos públicos cambian con frecuencia. Todos los registros
      son crowdsourced y se actualizan según reportes de la comunidad.
    </p>
  </aside>
</section>

<section class="panel">
  <div class="stat-strip">
    <span>Listado público</span>
    <span>{data.centers.length} registros</span>
  </div>

  {#if data.centers.length > 0}
    <div class="content-grid">
      {#each data.centers as center}
        <article class="data-card">
          <div class="data-card__head">
            <h2 class="data-card__title">{center.name}</h2>
            <span class="status-pill status-pill--pending">
              Crowdsourced
            </span>
          </div>
          <div class="data-card__body">
            <div class="data-card__row">
              <span class="material-symbols-outlined" aria-hidden="true">location_on</span>
              <div>
                <strong>{center.city} · {center.state}</strong>
                <p>{center.address || center.type}</p>
              </div>
            </div>
            {#if center.needs}
              <div class="data-card__note">{center.needs}</div>
            {/if}
            <div class="data-card__foot">
              <div>
                <span class="small-mono">Horario / contacto</span>
                <p>{[center.schedule, center.contact_public].filter(Boolean).join(' · ') || 'No especificado'}</p>
              </div>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <div class="empty-state empty-state--accent">
      No hay centros comunitarios reportados en este momento. Los registros aparecerán aquí de forma inmediata.
    </div>
  {/if}
</section>
