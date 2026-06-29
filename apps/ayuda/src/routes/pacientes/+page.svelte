<script lang="ts">
  import SearchInput from '$lib/components/SearchInput.svelte';
  import { dev } from '$app/environment';

  // Edicion en UI: solo en desarrollo, para verificar transcripciones contra las fotos.
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
  let saving = false;
  let saveError = '';
  let editForm = {
    patient_name: '',
    cedula_last3: '',
    age: '',
    condition_public: 'hospitalized',
    public_notes: ''
  };

  function startEdit(p: (typeof data.patients)[number]) {
    editingId = p.id;
    expandedRows[p.id] = true;
    saveError = '';
    editForm = {
      patient_name: p.patient_name ?? '',
      cedula_last3: p.cedula_last3 ?? '',
      age: p.age != null ? String(p.age) : '',
      condition_public: p.condition_public ?? 'hospitalized',
      public_notes: p.public_notes ?? ''
    };
  }

  function cancelEdit() {
    editingId = null;
    saveError = '';
  }

  async function saveEdit(id: string) {
    saving = true;
    saveError = '';
    try {
      const res = await fetch('/pacientes/edit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id,
          patient_name: editForm.patient_name,
          cedula_last3: editForm.cedula_last3,
          age: editForm.age === '' ? null : editForm.age,
          condition_public: editForm.condition_public,
          public_notes: editForm.public_notes
        })
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.message || `Error ${res.status}`);
      }
      const { record } = await res.json();
      data.patients = data.patients.map((p) => (p.id === id ? { ...p, ...record } : p));
      data = data;
      editingId = null;
    } catch (e) {
      saveError = e instanceof Error ? e.message : 'Error al guardar';
    } finally {
      saving = false;
    }
  }

  export let data: {
    patients: Array<{
      id: string;
      patient_name: string;
      cedula_last3: string;
      age?: number;
      hospital?: string;
      condition_public?: string;
      last_seen_at?: string;
      public_notes?: string;
      source_name?: string;
      status?: string;
    }>;
  };

  let query = '';
  
  // Los registros públicos solo llevan cedula_last3, así que no hay clave de cédula completa
  // para deduplicar: se listan tal cual llegan del backend.
  $: deduplicatedPatients = data.patients;

  let viewMode: 'list' | 'grid' = 'list';
  let expandedRows: Record<string, boolean> = {};

  function toggleRow(id: string) {
    expandedRows[id] = !expandedRows[id];
  }

  $: filteredPatients = deduplicatedPatients.filter((patient) => {
    const normalQuery = query.toLowerCase().trim();
    if (!normalQuery) return true;

    const haystack = [
      patient.patient_name,
      patient.cedula_last3,
      patient.hospital,
      patient.condition_public,
      patient.public_notes,
      patient.source_name
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (haystack.includes(normalQuery)) return true;

    const queryDigits = normalQuery.replace(/\D/g, '');
    if (queryDigits.length > 0) {
      const patientCedulaDigits = (patient.cedula_last3 || '').replace(/\D/g, '');
      if (patientCedulaDigits && patientCedulaDigits.includes(queryDigits)) {
        return true;
      }
    }
    return false;
  });
</script>

<svelte:head>
  <title>Pacientes | Sismo VE</title>
  <meta
    name="description"
    content="Registro público minimizado de pacientes con corrección visible y cédula reducida a los últimos 3 dígitos."
  />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">BASE DE DATOS DESCENTRALIZADA</p>
  <h1 class="page-title">Registro público<br />de pacientes</h1>
  <p class="page-lead">
    Consulta registros públicos minimizados de personas ingresadas en centros de atención. Por
    protección de identidad, la vista pública no muestra contactos privados ni cédulas completas.
  </p>
</section>

<section class="toolbar" aria-label="Parámetros de búsqueda">
  <SearchInput
    id="patients-search"
    label="Parámetros de búsqueda"
    placeholder="Nombre, centro médico o cédula parcial"
    bind:value={query}
  />
  <div class="toolbar__actions" style="flex: 1 1 auto; justify-content: space-between;">
    <div style="display: flex; gap: 0.5rem;">
      <button class="button-brutal {viewMode === 'list' ? '' : 'button-brutal--ghost'}" on:click={() => viewMode = 'list'} aria-label="Vista de lista">
        <span class="material-symbols-outlined" aria-hidden="true">view_list</span>
      </button>
      <button class="button-brutal {viewMode === 'grid' ? '' : 'button-brutal--ghost'}" on:click={() => viewMode = 'grid'} aria-label="Vista de cuadrícula">
        <span class="material-symbols-outlined" aria-hidden="true">grid_view</span>
      </button>
    </div>
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <a class="button-brutal" href="/pacientes/registrar">
        <span class="material-symbols-outlined" aria-hidden="true">person_add</span>
        Registrar paciente
      </a>
      <a class="button-brutal button-brutal--ghost" href="/correcciones">
        <span class="material-symbols-outlined" aria-hidden="true">edit_note</span>
        Solicitar corrección
      </a>
    </div>
  </div>
  <div style="flex-basis: 100%; margin-top: -0.75rem;">
    <p class="muted-note" style="margin: 0; font-size: 0.85rem;">
      Los registros visibles quedan restringidos a información pública minimizada.
    </p>
  </div>
</section>

<section class="panel">
  <div class="stat-strip">
    <span>Mostramos registros revisados o pendientes</span>
    <span>{filteredPatients.length} en línea</span>
  </div>

  {#if filteredPatients.length > 0}
    {#if viewMode === 'list'}
      <div class="list-view">
        {#each filteredPatients as patient}
          <div class="list-row {expandedRows[patient.id] ? 'list-row--expanded' : ''}">
            <button class="list-row__header" on:click={() => toggleRow(patient.id)}>
              <div class="list-row__main">
                <span class="list-row__title">{patient.patient_name}</span>
                <span class="list-row__hospital">{patient.hospital || 'Hospital no especificado'}</span>
              </div>
              <div class="list-row__status">
                <span class="status-pill status-pill--pending">
                  Crowdsourced
                </span>
                <span class="material-symbols-outlined" aria-hidden="true">
                  {expandedRows[patient.id] ? 'expand_less' : 'expand_more'}
                </span>
              </div>
            </button>
            {#if expandedRows[patient.id]}
              <div class="list-row__content">
                {#if editingId === patient.id}
                  <div class="edit-form">
                    <label class="edit-field">
                      <span>Nombre</span>
                      <input class="edit-input" bind:value={editForm.patient_name} />
                    </label>
                    <label class="edit-field">
                      <span>C.I. (últimos 3)</span>
                      <input class="edit-input" maxlength="3" inputmode="numeric" bind:value={editForm.cedula_last3} />
                    </label>
                    <label class="edit-field">
                      <span>Edad</span>
                      <input class="edit-input" inputmode="numeric" bind:value={editForm.age} />
                    </label>
                    <label class="edit-field">
                      <span>Estado</span>
                      <select class="edit-input" bind:value={editForm.condition_public}>
                        {#each CONDITION_OPTIONS as opt}
                          <option value={opt.value}>{opt.label}</option>
                        {/each}
                      </select>
                    </label>
                    <label class="edit-field edit-field--wide">
                      <span>Notas (diagnóstico / alergia)</span>
                      <textarea class="edit-input" rows="2" bind:value={editForm.public_notes}></textarea>
                    </label>
                    {#if saveError}
                      <p class="edit-error" role="alert">{saveError}</p>
                    {/if}
                    <div class="list-row__actions">
                      <button class="button-brutal button-brutal--ghost" on:click={cancelEdit} disabled={saving}>Cancelar</button>
                      <button class="button-brutal" on:click={() => saveEdit(patient.id)} disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar corrección'}
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="list-row__grid">
                    <div>
                      <strong>C.I. parcial:</strong> {patient.cedula_last3 ? '*** *** ' + patient.cedula_last3 : 'N/A'}
                    </div>
                    {#if patient.age}
                      <div><strong style="color: var(--accent-orange);">Edad:</strong> {patient.age}</div>
                    {/if}
                    <div>
                      <strong>Estado:</strong> {patient.condition_public || 'No especificado'}
                    </div>
                    <div>
                      <strong>Último reporte:</strong> {patient.last_seen_at || 'No especificado'}
                    </div>
                    {#if patient.public_notes || patient.source_name}
                      <div style="grid-column: 1 / -1;">
                        <strong>Notas:</strong> {[patient.public_notes, patient.source_name].filter(Boolean).join(' · ')}
                      </div>
                    {/if}
                  </div>
                  <div class="list-row__actions">
                    {#if dev}
                      <button class="button-brutal" on:click={() => startEdit(patient)}>Editar (verificación)</button>
                    {/if}
                    <a class="button-brutal button-brutal--ghost" href="/correcciones">Corregir registro</a>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="content-grid">
        {#each filteredPatients as patient}
          <article class="data-card">
            <div class="data-card__head">
              <h2 class="data-card__title">{patient.patient_name}</h2>
              <span class="status-pill status-pill--pending">
                Crowdsourced
              </span>
            </div>
            <div class="data-card__body">
              <div class="data-card__row">
                <span class="material-symbols-outlined" aria-hidden="true">local_hospital</span>
                <div>
                  <strong>{patient.hospital || 'Hospital no especificado'}</strong>
                  <p>{patient.condition_public || 'Estado no especificado'}</p>
                </div>
              </div>
              <div class="data-card__note">
                <span>C.I. parcial: {patient.cedula_last3 ? '*** *** ' + patient.cedula_last3 : 'N/A'}</span>
                {#if patient.age}
                  <span style="margin-left: 0.8rem; font-weight: bold; color: var(--accent-orange);">Edad: {patient.age}</span>
                {/if}
              </div>
              {#if patient.public_notes || patient.source_name}
                <p class="muted-note">
                  {[patient.public_notes, patient.source_name].filter(Boolean).join(' · ')}
                </p>
              {/if}
              <div class="data-card__foot">
                <div>
                  <span class="small-mono">Último reporte</span>
                  <p>{patient.last_seen_at || 'No especificado'}</p>
                </div>
                <a class="button-brutal button-brutal--ghost" href="/correcciones">Corregir</a>
              </div>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  {:else}
    <section class="empty-state empty-state--accent">
      No hay registros públicos para estos parámetros. El alta y las correcciones tienen rutas
      visibles para revisión editorial.
    </section>
  {/if}
</section>

<section class="panel">
  <div class="panel__head">
    <h2 class="panel__title">Ruta de alta</h2>
    <a class="button-brutal" href="/pacientes/registrar">Registrar paciente</a>
  </div>
  <div class="surface">
    <p class="muted-note">
      La información enviada puede ser visible públicamente para facilitar reunificación y
      asistencia. No publique cédulas completas, direcciones residenciales, teléfonos personales,
      diagnósticos detallados ni fotos sensibles.
    </p>
  </div>
</section>

<style>
  .list-view {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .list-row {
    background: #0e0e0e;
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: hidden;
  }
  .list-row--expanded {
    border-color: var(--accent-orange);
  }
  .list-row__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 1rem 1.2rem;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }
  .list-row__header:hover {
    background: #1a1a1a;
  }
  .list-row__main {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .list-row__title {
    font-family: var(--mono);
    font-size: 1.02rem;
    text-transform: uppercase;
    font-weight: bold;
  }
  .list-row__hospital {
    font-size: 0.85rem;
    color: var(--text-dim);
  }
  .list-row__status {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .list-row__content {
    padding: 1.2rem;
    border-top: 1px dashed var(--line-soft);
    background: #141414;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
  .list-row__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  .list-row__grid strong {
    color: white;
  }
  .list-row__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
  }
  .edit-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.9rem;
  }
  .edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  .edit-field--wide {
    grid-column: 1 / -1;
  }
  .edit-input {
    background: #0e0e0e;
    border: 1px solid var(--line);
    color: white;
    padding: 0.5rem 0.6rem;
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.95rem;
  }
  .edit-input:focus {
    outline: 2px solid var(--accent-orange);
    outline-offset: 1px;
  }
  .edit-error {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--accent-orange);
    font-size: 0.85rem;
  }
</style>
