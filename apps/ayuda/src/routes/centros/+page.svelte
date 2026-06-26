<script lang="ts">
  import LeafletMap from '$lib/components/LeafletMap.svelte';
  import RecordCard from '$lib/components/RecordCard.svelte';

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
  <meta name="description" content="Centros de acopio y apoyo con mapa Leaflet y revisión editorial." />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">CENTROS Y LOGÍSTICA</p>
  <h1 class="page-title">Centros</h1>
  <p class="page-lead">
    Los centros, albergues y puntos logísticos cambian rápido. El mapa y la lista se revisan
    online, y solo lo aprobado queda visible.
  </p>
</section>

<LeafletMap
  title="Mapa de centros"
  headingId="mapa-centros"
  description="Leaflet se usa solo para registros aprobados y visibles."
  {markers}
  emptyLabel="No hay centros aprobados para mostrar."
/>

<section class="panel">
  <div class="panel__head">
    <h2 class="panel__title">Listado</h2>
    <span class="panel__meta">{data.centers.length} registros</span>
  </div>

  {#if data.centers.length > 0}
    <div class="content-grid">
      {#each data.centers as center}
        <RecordCard
          title={center.name}
          meta={`${center.city} · ${center.state} · ${center.type}`}
          description={[center.address, center.needs, center.schedule, center.contact_public].filter(Boolean).join(' · ')}
          status={center.verification_status ?? 'Pendiente'}
          tone={center.verification_status === 'verified' ? 'verified' : 'pending'}
        />
      {/each}
    </div>
  {:else}
    <div class="empty-state empty-state--accent">
      No hay centros aprobados en este momento. Los registros verificados aparecerán aquí.
    </div>
  {/if}
</section>
