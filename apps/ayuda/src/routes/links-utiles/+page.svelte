<script lang="ts">
  import RecordCard from '$lib/components/RecordCard.svelte';

  export let data: {
    links: Array<{
      id: string;
      title: string;
      category: string;
      url: string;
      description: string;
    }>;
  };
</script>

<svelte:head>
  <title>Links útiles | Sismo VE</title>
  <meta name="description" content="Herramientas y enlaces útiles para comunicación y conectividad." />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">HERRAMIENTAS</p>
  <h1 class="page-title">Links útiles</h1>
  <p class="page-lead">
    Recursos externos para comunicación, conectividad y coordinación. Verifica disponibilidad y
    compatibilidad antes de depender de ellos.
  </p>
</section>

<section class="content-grid">
  {#each data.links as link}
    <RecordCard title={link.title} meta={link.category} description={link.description} href={link.url} status="Abrir" tone="verified" />
  {/each}
</section>
