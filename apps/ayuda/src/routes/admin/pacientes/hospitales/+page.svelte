<script lang="ts">
  export let data: {
    hospitals: Array<{
      slug: string;
      display_hospital: string;
      records: number;
      low_confidence: number;
      with_cedula_full: number;
      duplicates_dropped: number;
      vrChecked: boolean;
      generated_at: string;
    }>;
  };
</script>

<svelte:head><title>Hospitales | Revisión de importación</title></svelte:head>

<section class="head">
  <p class="eyebrow">IMPORTACIÓN · PACIENTES</p>
  <h1 class="title">Hospitales con extracción</h1>
  <p class="lead">Listados enviados por la comunidad, transcritos por hospital para revisión.</p>
</section>

{#if data.hospitals.length}
  <section class="grid" aria-label="Hospitales">
    {#each data.hospitals as h}
      <a class="card" href={`/admin/pacientes/${h.slug}`}>
        <div class="card__head">
          <h2>{h.display_hospital}</h2>
          {#if h.vrChecked}<span class="badge">VR</span>{/if}
        </div>
        <p class="slug">{h.slug}</p>
        <div class="metrics">
          <span><strong>{h.records}</strong> registros</span>
          <span><strong>{h.low_confidence}</strong> baja confianza</span>
          <span><strong>{h.with_cedula_full}</strong> cédula privada</span>
          <span><strong>{h.duplicates_dropped}</strong> duplicados</span>
        </div>
      </a>
    {/each}
  </section>
{:else}
  <p class="empty">No hay extracciones disponibles. Corre el ensamblador.</p>
{/if}

<style>
  .head { margin-bottom: 1.2rem; }
  .eyebrow {
    margin: 0 0 0.3rem;
    color: var(--accent-yellow, #f5c518);
    font-family: var(--mono);
    font-size: 0.75rem;
  }
  .title {
    margin: 0;
    font-family: var(--mono);
    font-size: 1.45rem;
    text-transform: uppercase;
  }
  .lead { margin: 0.35rem 0 0; color: var(--text-dim); }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.8rem;
  }
  .card {
    display: block;
    border: 1px solid var(--line);
    background: #101010;
    padding: 0.9rem;
    color: inherit;
    text-decoration: none;
    min-height: 44px;
  }
  .card:hover { border-color: var(--accent-yellow, #f5c518); }
  .card:focus-visible { outline: 2px solid var(--accent-yellow, #f5c518); outline-offset: 2px; }
  .card__head {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 0.5rem;
  }
  .card h2 {
    margin: 0;
    font-family: var(--mono);
    font-size: 1rem;
    text-transform: uppercase;
    color: var(--accent-yellow, #f5c518);
  }
  .badge {
    border: 1px solid var(--line);
    background: var(--accent-orange);
    color: #111;
    font-family: var(--mono);
    font-size: 0.7rem;
    padding: 0 0.4rem;
  }
  .slug {
    margin: 0.3rem 0 0.6rem;
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--text-muted);
    overflow-wrap: anywhere;
  }
  .metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.9rem;
    color: var(--text-dim);
    font-size: 0.82rem;
  }
  .metrics strong {
    color: white;
    font-family: var(--mono);
  }
  .empty {
    border: 1px solid var(--line);
    background: #101010;
    padding: 1rem;
    color: var(--text-muted);
  }
</style>
