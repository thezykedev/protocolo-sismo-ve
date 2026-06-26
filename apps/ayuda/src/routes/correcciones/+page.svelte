<script lang="ts">
  export let form: { message?: string } | undefined;
</script>

<svelte:head>
  <title>Correcciones | Sismo VE</title>
  <meta name="description" content="Solicitud de corrección, retiro o revisión de registros públicos." />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">CORRECCIÓN Y RETIRO</p>
  <h1 class="page-title">Correcciones</h1>
  <p class="page-lead">
    Esta ruta mantiene visible el canal de revisión para datos erróneos, sensibles o ya resueltos.
  </p>
</section>

{#if form?.message}
  <section class="empty-state empty-state--accent">{form.message}</section>
{/if}

<form method="POST" class="form-grid">
  <label class="field">
    <span class="field__label">Colección</span>
    <select class="field__select" name="target_collection" required>
      <option value="patients_public">Pacientes</option>
      <option value="hospitals">Hospitales</option>
      <option value="collection_centers">Centros</option>
      <option value="allied_sites">Aliados</option>
      <option value="seismic_events">Sismos</option>
    </select>
  </label>

  <label class="field">
    <span class="field__label">Registro</span>
    <input class="field__input" name="target_record" required />
  </label>

  <label class="field">
    <span class="field__label">Nombre</span>
    <input class="field__input" name="requester_name" required />
  </label>

  <label class="field">
    <span class="field__label">Contacto</span>
    <input class="field__input" name="requester_contact" />
  </label>

  <label class="field">
    <span class="field__label">Relación</span>
    <input class="field__input" name="relationship" />
  </label>

  <label class="field">
    <span class="field__label">Motivo</span>
    <textarea class="field__textarea" name="reason" required></textarea>
  </label>

  <button class="button-brutal" type="submit">Enviar corrección</button>
</form>

<section class="panel">
  <div class="surface">
    <p class="muted-note">
      Los registros se revisan antes de borrar o exponer menos información. Este canal existe para
      corrección, retiro y trazabilidad.
    </p>
  </div>
</section>
