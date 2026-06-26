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
    Este formulario existe para reunir información pública mínima. La cédula se reduce a los
    últimos 3 dígitos y el dato sensible no se amplía.
  </p>
</section>

{#if form?.message}
  <section class="empty-state empty-state--accent">{form.message}</section>
{/if}

<form method="POST" class="form-grid">
  <label class="field">
    <span class="field__label">Nombre</span>
    <input class="field__input" name="patient_name" required minlength="3" />
  </label>

  <label class="field">
    <span class="field__label">Cédula</span>
    <input
      class="field__input"
      name="cedula"
      inputmode="numeric"
      required
      placeholder="Solo se publican los últimos 3 dígitos"
    />
  </label>

  <label class="field">
    <span class="field__label">Hospital</span>
    <input class="field__input" name="hospital" />
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
    <span class="field__label">Nombre de la fuente</span>
    <input class="field__input" name="source_name" placeholder="Familia, hospital, voluntariado" />
  </label>

  <label class="field">
    <span class="field__label">Enlace o referencia</span>
    <input class="field__input" name="source_url" />
  </label>

  <label class="field">
    <span class="field__label">Notas públicas</span>
    <textarea class="field__textarea" name="public_notes"></textarea>
  </label>

  <button class="button-brutal" type="submit">Enviar registro</button>
</form>

<section class="panel">
  <div class="surface">
    <p class="muted-note">
      La informacion enviada puede ser visible publicamente para facilitar reunificacion y
      asistencia durante la emergencia. No publique cedulas completas, direcciones residenciales,
      telefonos personales del paciente, diagnosticos detallados ni fotos sensibles. La cedula se
      mostrara solo con sus ultimos 3 digitos.
    </p>
  </div>
</section>
