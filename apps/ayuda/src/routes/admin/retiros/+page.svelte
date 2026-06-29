<script lang="ts">
  import { enhance } from '$app/forms';
  export let data: { requests: Array<Record<string, any>>; loadError: string | null };
  export let form: { error?: string; ok?: boolean; message?: string } | null;
  let busyId: string | null = null;
</script>

<svelte:head><title>Solicitudes de retiro | Sismo VE</title></svelte:head>

<section class="head">
  <h1 class="title">Solicitudes de retiro</h1>
  <p class="lead">Pedidos de la comunidad para retirar un registro público. Aceptar lo archiva (deja de mostrarse).</p>
</section>

{#if data.loadError}<p class="warn">No se pudo leer la cola: {data.loadError}</p>{/if}
{#if form?.error}<p class="warn" role="alert">{form.error}</p>{/if}
{#if form?.ok && form?.message}<p class="ok">{form.message}</p>{/if}

{#if data.requests.length === 0}
  <p class="empty">No hay solicitudes de retiro pendientes.</p>
{:else}
  <div class="rows">
    {#each data.requests as r (r.id)}
      <article class="row">
        <div class="row__body">
          <p class="row__meta">
            <span class="tag">{r.target_collection}</span>
            <code>{r.target_record}</code>
          </p>
          <p class="row__reason"><strong>Motivo:</strong> {r.reason || '—'}</p>
          <p class="row__who">
            Solicita: {r.requester_name || 'anónimo'}
            {#if r.relationship}· {r.relationship}{/if}
            {#if r.requester_contact}· {r.requester_contact}{/if}
          </p>
        </div>
        <div class="actions">
          <form method="POST" action="?/accept" use:enhance={() => { busyId = r.id; return async ({ update }) => { await update(); busyId = null; }; }}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="target_collection" value={r.target_collection} />
            <input type="hidden" name="target_record" value={r.target_record} />
            <button class="button-brutal button-danger" type="submit" disabled={busyId === r.id}>Aceptar y archivar</button>
          </form>
          <form method="POST" action="?/reject" use:enhance={() => { busyId = r.id; return async ({ update }) => { await update(); busyId = null; }; }}>
            <input type="hidden" name="id" value={r.id} />
            <button class="button-brutal button-brutal--ghost" type="submit" disabled={busyId === r.id}>Rechazar</button>
          </form>
        </div>
      </article>
    {/each}
  </div>
{/if}

<style>
  .head { margin-bottom: 1rem; }
  .title { font-family: var(--mono); font-size: 1.5rem; margin: 0 0 0.3rem; }
  .lead { color: var(--text-dim); margin: 0; }
  .warn { color: var(--accent-orange); }
  .ok { color: #5fd07a; }
  .empty { color: var(--text-dim); padding: 1.5rem 0; }
  .rows { display: flex; flex-direction: column; gap: 0.7rem; }
  .row {
    background: #0e0e0e;
    border: 1px solid var(--line);
    border-left: 4px solid var(--accent-orange);
    border-radius: 5px;
    padding: 1rem 1.1rem;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .row__meta { margin: 0 0 0.4rem; display: flex; gap: 0.5rem; align-items: center; }
  .tag { font-family: var(--mono); font-size: 0.72rem; background: #1a1a1a; border: 1px solid var(--line); padding: 0.15rem 0.4rem; border-radius: 3px; color: var(--text-muted); }
  code { font-size: 0.8rem; color: var(--text-dim); }
  .row__reason { margin: 0 0 0.3rem; font-size: 0.92rem; }
  .row__who { margin: 0; font-size: 0.82rem; color: var(--text-dim); }
  .actions { display: flex; gap: 0.5rem; align-items: flex-start; flex-wrap: wrap; }
  .button-danger { background: #7a1f1f; border-color: #a32d2d; color: white; }
</style>
