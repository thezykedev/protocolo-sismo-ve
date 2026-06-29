<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: { patients: Array<Record<string, any>>; loadError: string | null };
  export let form: { error?: string; ok?: boolean; saved?: string } | null;

  const CONDITION_OPTIONS = [
    { value: 'hospitalized', label: 'Hospitalizado' },
    { value: 'stable', label: 'Estable' },
    { value: 'observation', label: 'En observación' },
    { value: 'discharged', label: 'De alta / egresado' },
    { value: 'unknown', label: 'Desconocido' },
    { value: 'deceased_unconfirmed', label: 'Fallecido (sin confirmar)' },
    { value: 'deceased_verified', label: 'Fallecido (confirmado)' }
  ];

  let editingId: string | null = null;
  let busyId: string | null = null;

  function startEdit(p: Record<string, any>) {
    editingId = p.id;
  }
</script>

<svelte:head><title>Revisión de pacientes | Sismo VE</title></svelte:head>

<section class="head">
  <h1 class="title">Pacientes por revisar</h1>
  <p class="lead">Registros enviados por la comunidad, pendientes de aprobación.</p>
</section>

{#if data.loadError}
  <p class="warn">No se pudo leer del backend: {data.loadError}</p>
{/if}

{#if form?.error}
  <p class="warn" role="alert">{form.error}</p>
{/if}

{#if data.patients.length === 0}
  <p class="empty">No hay registros pendientes. Todo al día.</p>
{:else}
  <div class="rows">
    {#each data.patients as p (p.id)}
      <article class="row" class:row--editing={editingId === p.id}>
        <div class="row__top">
          <div>
            <h2 class="row__name">{p.patient_name}</h2>
            <p class="row__meta">
              {p.hospital || 'Hospital no especificado'}
              · C.I. {p.cedula_last3 ? '*** ' + p.cedula_last3 : 'N/A'}
              {#if p.age}· {p.age} años{/if}
              · <span class="status">{p.status}</span>
            </p>
          </div>
        </div>

        {#if p.public_notes}
          <p class="row__notes">{p.public_notes}</p>
        {/if}

        {#if editingId === p.id}
          <form
            method="POST"
            action="?/save"
            class="edit"
            use:enhance={() => {
              busyId = p.id;
              return async ({ update }) => {
                await update({ reset: false });
                busyId = null;
                editingId = null;
              };
            }}
          >
            <input type="hidden" name="id" value={p.id} />
            <label class="f"><span>Nombre</span><input class="in" name="patient_name" value={p.patient_name ?? ''} /></label>
            <label class="f"><span>C.I. (últimos 3)</span><input class="in" name="cedula_last3" maxlength="3" inputmode="numeric" value={p.cedula_last3 ?? ''} /></label>
            <label class="f"><span>Edad</span><input class="in" name="age" inputmode="numeric" value={p.age ?? ''} /></label>
            <label class="f"><span>Estado</span>
              <select class="in" name="condition_public" value={p.condition_public ?? 'hospitalized'}>
                {#each CONDITION_OPTIONS as opt}<option value={opt.value}>{opt.label}</option>{/each}
              </select>
            </label>
            <label class="f f--wide"><span>Notas (diagnóstico / alergia)</span><textarea class="in" name="public_notes" rows="2">{p.public_notes ?? ''}</textarea></label>
            <div class="actions">
              <button type="button" class="button-brutal button-brutal--ghost" on:click={() => (editingId = null)} disabled={busyId === p.id}>Cancelar</button>
              <button type="submit" class="button-brutal" disabled={busyId === p.id}>{busyId === p.id ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        {:else}
          <div class="actions">
            <button class="button-brutal button-brutal--ghost" on:click={() => startEdit(p)}>Editar</button>
            <form method="POST" action="?/approve" use:enhance={() => { busyId = p.id; return async ({ update }) => { await update(); busyId = null; }; }}>
              <input type="hidden" name="id" value={p.id} />
              <button class="button-brutal button-approve" type="submit" disabled={busyId === p.id}>Aprobar</button>
            </form>
            <form method="POST" action="?/reject" use:enhance={() => { busyId = p.id; return async ({ update }) => { await update(); busyId = null; }; }}>
              <input type="hidden" name="id" value={p.id} />
              <button class="button-brutal button-brutal--ghost" type="submit" disabled={busyId === p.id}>Rechazar</button>
            </form>
          </div>
        {/if}
      </article>
    {/each}
  </div>
{/if}

<style>
  .head { margin-bottom: 1rem; }
  .title { font-family: var(--mono); font-size: 1.5rem; margin: 0 0 0.3rem; }
  .lead { color: var(--text-dim); margin: 0; }
  .warn { color: var(--accent-orange); }
  .empty { color: var(--text-dim); padding: 1.5rem 0; }
  .rows { display: flex; flex-direction: column; gap: 0.7rem; }
  .row {
    background: #0e0e0e;
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .row--editing { border-color: var(--accent-orange); }
  .row__name { font-family: var(--mono); font-size: 1.05rem; text-transform: uppercase; margin: 0; }
  .row__meta { color: var(--text-dim); font-size: 0.85rem; margin: 0.2rem 0 0; }
  .status { color: var(--accent-yellow, #f5c518); font-family: var(--mono); }
  .row__notes { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
  .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; }
  .actions form { display: contents; }
  .button-approve { background: #1f7a34; border-color: #2da34a; color: white; }
  .edit { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.8rem; }
  .f { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.78rem; color: var(--text-muted); }
  .f--wide { grid-column: 1 / -1; }
  .in {
    background: #161616;
    border: 1px solid var(--line);
    color: white;
    padding: 0.5rem 0.6rem;
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.95rem;
    min-height: 40px;
  }
  .in:focus { outline: 2px solid var(--accent-orange); outline-offset: 1px; }
</style>
