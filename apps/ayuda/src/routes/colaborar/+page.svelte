<script lang="ts">
  export let form: { message?: string } | undefined;
</script>

<svelte:head>
  <title>Colaborar | Sismo VE</title>
  <meta name="description" content="Canal para proponer aliados, centros y apoyo logístico." />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">APOYO CURADO</p>
  <h1 class="page-title">Colaborar</h1>
  <p class="page-lead">
    Las propuestas se centralizan aquí. Cada aporte pasa por revisión antes de entrar a un
    directorio visible.
  </p>
</section>

{#if form?.message}
  <section class="empty-state empty-state--accent">{form.message}</section>
{/if}

<form method="POST" class="form-grid">
  <label class="field">
    <span class="field__label">Tipo de aporte</span>
    <select class="field__select" name="target_collection" required>
      <option value="collection_centers">Centros</option>
      <option value="allied_sites">Aliados</option>
      <option value="hospitals">Hospitales</option>
      <option value="patients_public">Pacientes</option>
    </select>
  </label>

  <label class="field">
    <span class="field__label">Nombre u organización</span>
    <input class="field__input" name="proposed_name" required />
  </label>

  <label class="field">
    <span class="field__label">Contacto</span>
    <input class="field__input" name="proposed_contact" />
  </label>

  <label class="field">
    <span class="field__label">Detalle</span>
    <textarea class="field__textarea" name="payload" required></textarea>
  </label>

  <button class="button-brutal" type="submit">Enviar propuesta</button>
</form>

<section class="content-grid">
  <div class="surface">
    <p class="muted-note">
      Toda la información es aportada por la comunidad. Los datos se publican sin moderación previa.
    </p>
  </div>
  <div class="surface">
    <p class="muted-note">
      La información de emergencia no debe mezclarse con CTA de donación ni con flujos de
      información privada.
    </p>
  </div>
</section>
