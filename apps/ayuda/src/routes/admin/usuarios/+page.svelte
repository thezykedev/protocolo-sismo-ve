<script lang="ts">
  import { enhance } from '$app/forms';
  export let data: { users: Array<Record<string, any>>; loadError: string | null };
  export let form: { error?: string; ok?: boolean; created?: string; email?: string } | null;

  let creating = false;

  function roleLabel(role: string): string {
    if (role === 'admin') return 'Administrador';
    if (role === 'moderator') return 'Editor';
    return role || '—';
  }
</script>

<svelte:head><title>Colaboradores | Sismo VE</title></svelte:head>

<section class="head">
  <h1 class="title">Colaboradores</h1>
  <p class="lead">Designa quién puede curar el sitio. Editores aprueban y editan; administradores además gestionan cuentas.</p>
</section>

<section class="card">
  <h2 class="card__title">Invitar colaborador</h2>
  <form
    method="POST"
    action="?/create"
    class="invite"
    use:enhance={() => {
      creating = true;
      return async ({ update }) => { await update({ reset: true }); creating = false; };
    }}
  >
    <label class="f"><span>Correo</span><input class="in" name="email" type="email" required value={form?.error ? (form.email ?? '') : ''} /></label>
    <label class="f"><span>Contraseña inicial</span><input class="in" name="password" type="text" minlength="8" required placeholder="mín. 8 caracteres" /></label>
    <label class="f"><span>Nombre visible</span><input class="in" name="display_name" /></label>
    <label class="f"><span>Rol</span>
      <select class="in" name="role">
        <option value="moderator">Editor (cura contenido)</option>
        <option value="admin">Administrador (todo)</option>
      </select>
    </label>
    <div class="invite__action">
      <button class="button-brutal" type="submit" disabled={creating}>{creating ? 'Creando…' : 'Crear colaborador'}</button>
    </div>
  </form>
  {#if form?.error}<p class="warn" role="alert">{form.error}</p>{/if}
  {#if form?.ok && form?.created}<p class="ok">Colaborador creado: {form.created}</p>{/if}
</section>

<section class="card">
  <h2 class="card__title">Cuentas ({data.users.length})</h2>
  {#if data.loadError}
    <p class="warn">No se pudo leer la lista: {data.loadError}</p>
  {/if}
  <div class="users">
    {#each data.users as u (u.id)}
      <div class="user" class:user--off={u.active === false}>
        <div class="user__info">
          <strong>{u.display_name || u.email}</strong>
          <span class="user__email">{u.email}</span>
        </div>
        <span class="role-chip">{roleLabel(u.role)}</span>
        <span class="state">{u.active === false ? 'inactivo' : 'activo'}</span>
        <form method="POST" action="?/toggle" use:enhance>
          <input type="hidden" name="id" value={u.id} />
          <input type="hidden" name="active" value={u.active === false ? 'true' : 'false'} />
          <button class="button-brutal button-brutal--ghost" type="submit">
            {u.active === false ? 'Activar' : 'Desactivar'}
          </button>
        </form>
      </div>
    {/each}
  </div>
</section>

<style>
  .head { margin-bottom: 1.2rem; }
  .title { font-family: var(--mono); font-size: 1.5rem; margin: 0 0 0.3rem; }
  .lead { color: var(--text-dim); margin: 0; }
  .card {
    background: #0e0e0e;
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 1.1rem;
    margin-bottom: 1rem;
  }
  .card__title { font-family: var(--mono); font-size: 1.05rem; margin: 0 0 0.9rem; }
  .invite { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.8rem; align-items: end; }
  .f { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.78rem; color: var(--text-muted); }
  .in { background: #161616; border: 1px solid var(--line); color: white; padding: 0.55rem 0.6rem; border-radius: 3px; font-size: 0.95rem; min-height: 44px; }
  .in:focus { outline: 2px solid var(--accent-orange); outline-offset: 1px; }
  .invite__action { display: flex; align-items: end; }
  .warn { color: var(--accent-orange); margin: 0.8rem 0 0; }
  .ok { color: #5fd07a; margin: 0.8rem 0 0; }
  .users { display: flex; flex-direction: column; gap: 0.5rem; }
  .user {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    flex-wrap: wrap;
    padding: 0.7rem 0.9rem;
    background: #141414;
    border: 1px solid var(--line);
    border-radius: 4px;
  }
  .user--off { opacity: 0.55; }
  .user__info { display: flex; flex-direction: column; min-width: 180px; flex: 1; }
  .user__email { font-size: 0.8rem; color: var(--text-dim); }
  .role-chip { font-family: var(--mono); font-size: 0.78rem; color: var(--accent-orange); }
  .state { font-size: 0.78rem; color: var(--text-dim); font-family: var(--mono); }
</style>
