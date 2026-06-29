<script lang="ts">
  export let data: {
    user: { display_name?: string; email: string; role?: string } | null;
    pendingPatients: number | null;
    pendingUpdates: number | null;
    pendingRemovals: number | null;
  };

  function label(n: number | null): string {
    return n === null ? '—' : String(n);
  }
</script>

<svelte:head><title>Panel de curaduría | Sismo VE</title></svelte:head>

<section class="head">
  <h1 class="title">Panel de curaduría</h1>
  <p class="lead">Revisa lo que envía la comunidad y mantén el registro al día.</p>
</section>

<div class="cards">
  <a class="card" href="/admin/pacientes">
    <span class="card__num">{label(data.pendingPatients)}</span>
    <span class="card__label">Pacientes por revisar</span>
    <span class="card__cta">Abrir revisión →</span>
  </a>
  <a class="card" href="/admin/cambios">
    <span class="card__num">{label(data.pendingUpdates)}</span>
    <span class="card__label">Cambios sugeridos</span>
    <span class="card__cta">Revisar cambios →</span>
  </a>
  <a class="card" href="/admin/retiros">
    <span class="card__num">{label(data.pendingRemovals)}</span>
    <span class="card__label">Solicitudes de retiro</span>
    <span class="card__cta">Atender retiros →</span>
  </a>
</div>

{#if data.pendingPatients === null}
  <p class="warn">
    No se pudo leer del backend. Verifica que PocketBase esté arriba y que tu cuenta tenga permisos.
  </p>
{/if}

<style>
  .head { margin-bottom: 1.2rem; }
  .title { font-family: var(--mono); font-size: 1.6rem; margin: 0 0 0.3rem; }
  .lead { color: var(--text-dim); margin: 0; }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    background: #0e0e0e;
    border: 1px solid var(--line);
    border-left: 4px solid var(--accent-orange);
    border-radius: 5px;
    padding: 1.2rem;
    text-decoration: none;
    color: inherit;
  }
  .card:hover { border-color: var(--accent-orange); }
  .card__num { font-family: var(--mono); font-size: 2.2rem; font-weight: bold; }
  .card__label { color: var(--text-muted); }
  .card__cta { color: var(--accent-orange); font-size: 0.85rem; margin-top: 0.4rem; }
  .warn { margin-top: 1.2rem; color: var(--accent-orange); }
</style>
