<script lang="ts">
  import RecordCard from '$lib/components/RecordCard.svelte';

  export let data: {
    allies: Array<{
      id: string;
      name: string;
      category: string;
      website?: string;
      contact_public?: string;
      notes_public?: string;
      verification_status?: string;
    }>;
    lastUpdatedAt: string | null;
  };
</script>

<svelte:head>
  <title>Aliados | Sismo VE</title>
  <meta name="description" content="Red de apoyo comunitario y servicios aliados para respuesta y coordinación." />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">RED DE APOYO</p>
  <h1 class="page-title">Aliados</h1>
  <p class="page-lead">
    La red aliada se construye de forma comunitaria. Cada registro asume un contacto
    real, ubicación pública y una utilidad clara.
  </p>
</section>

{#if data.allies.length > 0}
  <section class="content-grid">
    {#each data.allies as ally}
      <RecordCard
        title={ally.name}
        meta={ally.category}
        description={[ally.notes_public, ally.contact_public].filter(Boolean).join(' · ')}
        href={ally.website ?? null}
        status="Crowdsourced"
        tone="pending"
      />
    {/each}
  </section>
{:else}
  <section class="empty-state empty-state--accent">
    No hay aliados comunitarios en este momento.
  </section>
{/if}
