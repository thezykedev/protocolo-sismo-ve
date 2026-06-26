<script lang="ts">
  import RecordCard from '$lib/components/RecordCard.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';

  export let data: {
    patients: Array<{
      id: string;
      patient_name: string;
      cedula_last3: string;
      hospital?: string;
      condition_public?: string;
      last_seen_at?: string;
      public_notes?: string;
      source_name?: string;
      status?: string;
    }>;
  };

  let query = '';
  $: filteredPatients = data.patients.filter((patient) => {
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

    return haystack.includes(query.toLowerCase());
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
  <p class="eyebrow">REGISTRO PÚBLICO</p>
  <h1 class="page-title">Pacientes</h1>
  <p class="page-lead">
    La publicación minimiza el dato sensible. Solo se muestra la información necesaria para
    reunificación, asistencia y revisión editorial.
  </p>
</section>

<section class="panel">
  <SearchInput
    id="patients-search"
    label="Buscar paciente"
    placeholder="Nombre, hospital, estado o cédula_last3"
    bind:value={query}
    help="Los registros visibles quedan restringidos a información pública."
  />
</section>

<section class="panel">
  <div class="panel__head">
    <h2 class="panel__title">Resultados</h2>
    <span class="panel__meta">{filteredPatients.length} registros</span>
  </div>

  {#if filteredPatients.length > 0}
    <div class="content-grid">
      {#each filteredPatients as patient}
        <RecordCard
          title={patient.patient_name}
          meta={[patient.hospital, patient.condition_public, patient.last_seen_at].filter(Boolean).join(' · ')}
          description={[`cedula_last3: ${patient.cedula_last3}`, patient.public_notes, patient.source_name].filter(Boolean).join(' · ')}
          status={patient.status ?? 'public_unverified'}
          tone="pending"
        />
      {/each}
    </div>
  {:else}
    <section class="empty-state empty-state--accent">
      No hay registros públicos publicados todavía. El alta y las correcciones viven en la ruta de
      registro.
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
