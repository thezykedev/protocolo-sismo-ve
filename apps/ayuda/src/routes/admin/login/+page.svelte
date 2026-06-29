<script lang="ts">
  import { enhance } from '$app/forms';
  export let data: { next: string };
  export let form: { error?: string; email?: string } | null;
  let submitting = false;
</script>

<svelte:head><title>Ingreso de colaboradores | Sismo VE</title></svelte:head>

<section class="login-wrap">
  <div class="login-card">
    <p class="eyebrow">PANEL DE CURADURÍA</p>
    <h1 class="login-title">Ingreso de colaboradores</h1>
    <p class="login-lead">Acceso para editores y administradores designados.</p>

    <form
      method="POST"
      action="?/login"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update();
          submitting = false;
        };
      }}
    >
      <input type="hidden" name="next" value={data.next} />
      <label class="field">
        <span>Correo</span>
        <input class="input" name="email" type="email" autocomplete="username" value={form?.email ?? ''} required />
      </label>
      <label class="field">
        <span>Contraseña</span>
        <input class="input" name="password" type="password" autocomplete="current-password" required />
      </label>

      {#if form?.error}
        <p class="form-error" role="alert">{form.error}</p>
      {/if}

      <button class="button-brutal" type="submit" disabled={submitting}>
        {submitting ? 'Verificando…' : 'Entrar'}
      </button>
    </form>

    <p class="muted-note">¿No tienes cuenta? Un administrador debe crearla y asignarte un rol.</p>
  </div>
</section>

<style>
  .login-wrap {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
  }
  .login-card {
    width: 100%;
    max-width: 420px;
    background: #0e0e0e;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 1.6rem;
  }
  .login-title {
    font-family: var(--mono);
    font-size: 1.5rem;
    margin: 0.2rem 0 0.4rem;
  }
  .login-lead {
    color: var(--text-dim);
    margin-bottom: 1.2rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .input {
    background: #161616;
    border: 1px solid var(--line);
    color: white;
    padding: 0.7rem 0.7rem;
    border-radius: 3px;
    font-size: 1rem;
    min-height: 44px;
  }
  .input:focus {
    outline: 2px solid var(--accent-orange);
    outline-offset: 1px;
  }
  .form-error {
    margin: 0;
    color: var(--accent-orange);
    font-size: 0.9rem;
  }
  .button-brutal {
    min-height: 44px;
  }
  .muted-note {
    margin-top: 1.2rem;
    font-size: 0.8rem;
    color: var(--text-dim);
  }
</style>
