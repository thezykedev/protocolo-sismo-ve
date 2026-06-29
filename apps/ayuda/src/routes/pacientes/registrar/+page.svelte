<script lang="ts">
  export let form: { message?: string } | undefined;
</script>

<svelte:head>
  <title>Registrar paciente | Sismo VE</title>
  <meta
    name="description"
    content="Formulario público con minimización de datos para registrar pacientes y solicitudes de asistencia."
  />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">NUEVO REGISTRO</p>
  <h1 class="page-title">Registrar paciente</h1>
  <p class="page-lead">
    Formulario público para reunir información mínima. La cédula se reduce a los últimos 3 dígitos
    y el registro aparecerá en los listados públicos de forma inmediata.
  </p>
</section>

{#if form?.message}
  <section class="empty-state empty-state--accent">{form.message}</section>
{/if}

<form method="POST" class="split-panel">
  <div class="split-panel__head">
    <h2 class="panel__title">Datos públicos mínimos</h2>
    <span class="panel__meta">Crowdsourced</span>
  </div>

  <div class="form-grid form-grid--two">
    <label class="field">
      <span class="field__label">Nombre o identificación pública</span>
      <input class="field__input" name="patient_name" required minlength="3" autocomplete="name" />
    </label>

    <label class="field">
      <span class="field__label">Cédula (V o E sin puntos)</span>
      <input
        class="field__input"
        name="cedula"
        required
        autocomplete="off"
        pattern="^([VEve]\d+|N/A|n/a)$"
        placeholder="Ej: V2323232, E5656595 o N/A"
      />
    </label>

    <label class="field">
      <span class="field__label">Centro de atención</span>
      <input class="field__input" name="hospital" autocomplete="organization" />
    </label>

    <label class="field">
      <span class="field__label">Estado público</span>
      <select class="field__select" name="condition_public">
        <option value="unknown">Desconocido</option>
        <option value="stable">Estable</option>
        <option value="observation">Observación</option>
        <option value="hospitalized">Hospitalizado</option>
        <option value="discharged">Alta</option>
        <option value="deceased_unconfirmed">Fallecimiento no confirmado</option>
      </select>
    </label>

    <label class="field">
      <span class="field__label">Fuente pública</span>
      <input class="field__input" name="source_name" placeholder="Familia, hospital, voluntariado" />
    </label>

    <label class="field">
      <span class="field__label">Enlace o referencia</span>
      <input class="field__input" name="source_url" inputmode="url" />
    </label>

    <label class="field field--wide">
      <span class="field__label">Notas públicas</span>
      <textarea
        class="field__textarea"
        name="public_notes"
        placeholder="Incluya solo información útil para reunificación o asistencia."
      ></textarea>
    </label>
  </div>

  <button class="button-brutal" type="submit">
    <span class="material-symbols-outlined" aria-hidden="true">send</span>
    Enviar registro
  </button>
</form>

<section class="panel">
  <div class="surface">
    <p class="muted-note">
      La información enviada puede ser visible públicamente para facilitar reunificación y
      asistencia durante la emergencia. No publique cédulas completas, direcciones residenciales,
      teléfonos personales del paciente, diagnósticos detallados ni fotos sensibles. La cédula se
      mostrará solo con sus últimos 3 dígitos.
    </p>
  </div>
</section>
