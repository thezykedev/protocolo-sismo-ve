<script lang="ts">
  import { enhance } from '$app/forms';
  export let data: { changes: Array<Record<string, any>>; loadError: string | null };
  export let form: { error?: string; ok?: boolean; message?: string } | null;
  let busyId: string | null = null;
</script>

<svelte:head><title>Cambios sugeridos | Sismo VE</title></svelte:head>

<section class="head">
  <h1 class="title">Cambios sugeridos</h1>
  <p class="lead">Correcciones enviadas por la comunidad. Aceptar aplica los campos públicos permitidos al registro.</p>
</section>

{#if data.loadError}<p class="warn">No se pudo leer la cola: {data.loadError}</p>{/if}
{#if form?.error}<p class="warn" role="alert">{form.error}</p>{/if}
{#if form?.ok && form?.message}<p class="ok">{form.message}</p>{/if}

{#if data.changes.length === 0}
  <p class="empty">No hay cambios sugeridos pendientes.</p>
{:else}
  <div class="rows">
    {#each data.changes as c (c.id)}
      <article class="row">
        <p class="row__meta"><span class="tag">{c.target_collection}</span> <code>{c.target_record}</code></p>
        {#if c.parse_error}
          <p class="warn">El envío trae JSON inválido; revísalo antes de aceptar.</p>
        {:else if Object.keys(c.parsed_allowed).length === 0}
          <p class="muted">Sin campos públicos válidos en el envío.</p>
        {:else}
          <table class="diff">
            <tbody>
              {#each Object.entries(c.parsed_allowed) as [k, v]}
                <tr><th>{k}</th><td>{v}</td></tr>
              {/each}
            </tbody>
          </table>
        {/if}
        <p class="row__who">Sugiere: {c.submitted_by_name || 'anónimo'}{#if c.submitted_by_contact}· {c.submitted_by_contact}{/if}</p>
        <div class="actions">
          <form method="POST" action="?/accept" use:enhance={() => { busyId = c.id; return async ({ update }) => { await update(); busyId = null; }; }}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="target_collection" value={c.target_collection} />
            <input type="hidden" name="target_record" value={c.target_record} />
            <button class="button-brutal" type="submit" disabled={busyId === c.id || c.parse_error || Object.keys(c.parsed_allowed).length === 0}>Aceptar y aplicar</button>
          </form>
          <form method="POST" action="?/reject" use:enhance={() => { busyId = c.id; return async ({ update }) => { await update(); busyId = null; }; }}>
            <input type="hidden" name="id" value={c.id} />
            <button class="button-brutal button-brutal--ghost" type="submit" disabled={busyId === c.id}>Rechazar</button>
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
  .muted { color: var(--text-dim); }
  .empty { color: var(--text-dim); padding: 1.5rem 0; }
  .rows { display: flex; flex-direction: column; gap: 0.7rem; }
  .row { background: #0e0e0e; border: 1px solid var(--line); border-radius: 5px; padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .row__meta { margin: 0; display: flex; gap: 0.5rem; align-items: center; }
  .tag { font-family: var(--mono); font-size: 0.72rem; background: #1a1a1a; border: 1px solid var(--line); padding: 0.15rem 0.4rem; border-radius: 3px; color: var(--text-muted); }
  code { font-size: 0.8rem; color: var(--text-dim); }
  .diff { border-collapse: collapse; font-size: 0.88rem; }
  .diff th { text-align: left; color: var(--accent-orange); padding: 0.2rem 0.8rem 0.2rem 0; font-family: var(--mono); font-weight: normal; vertical-align: top; }
  .diff td { color: white; padding: 0.2rem 0; }
  .row__who { margin: 0; font-size: 0.82rem; color: var(--text-dim); }
  .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
</style>
