<script lang="ts">
  import RecordCard from '$lib/components/RecordCard.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';

  export let data: {
    hospitals: Array<{
      id: string;
      name: string;
      city: string;
      state: string;
      address?: string;
      capacity_note?: string;
      services?: string[];
      source_name?: string;
      source_url?: string;
      verification_status?: string;
    }>;
    lastUpdatedAt: string | null;
  };
</script>

<svelte:head>
  <title>Hospitales | Sismo VE</title>
  <meta
    name="description"
    content="Coordinación hospitalaria online con revisión frecuente y mínima exposición de datos."
  />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">COORDINACIÓN HOSPITALARIA</p>
  <h1 class="page-title">Hospitales</h1>
  <p class="page-lead">
    La coordinación hospitalaria se consulta aquí. Los registros públicos permanecen minimizados y
    la revisión editorial controla la publicación de datos sensibles.
  </p>
</section>

<section class="panel">
  <div class="panel__head">
    <h2 class="panel__title">Estado de revisión</h2>
    <span class="panel__meta">Cache: no-cache, max-age=60</span>
  </div>
  <div class="content-grid">
    <div class="surface">
      <p class="muted-note">Registros cargados: {data.hospitals.length}</p>
    </div>
    <div class="surface">
      <p class="muted-note">
        Última actualización: {data.lastUpdatedAt ? new Date(data.lastUpdatedAt).toLocaleString('es-VE') : 'pendiente'}.
      </p>
    </div>
    <div class="surface">
      <p class="muted-note">
        Si falta un dato o cambia un contacto, la corrección se registra y se revisa aparte.
      </p>
    </div>
  </div>
</section>

{#if data.hospitals.length > 0}
  <section class="content-grid">
    {#each data.hospitals as hospital}
      <RecordCard
        title={hospital.name}
        meta={`${hospital.city} · ${hospital.state}`}
        description={[hospital.address, hospital.capacity_note, hospital.services?.join(', ')].filter(Boolean).join(' · ')}
        href={hospital.source_url ?? null}
        status={hospital.verification_status ?? 'Revisar'}
        tone={hospital.verification_status === 'verified' ? 'verified' : 'pending'}
      />
    {/each}
  </section>
{:else}
  <section class="empty-state empty-state--accent">
    No hay hospitales aprobados en este momento. Los registros verificados aparecerán aquí después
    de revisión.
  </section>
{/if}

<section class="panel">
  <div class="panel__head">
    <h2 class="panel__title">Correcciones</h2>
    <StatusPill label="Visible" tone="verified" />
  </div>
  <div class="surface">
    <p class="muted-note">
      Un dato hospitalario que cambie debe pasar por revisión. La vía de corrección está en
      <a href="/correcciones">/correcciones</a>.
    </p>
  </div>
</section>
