<script lang="ts">
  import { page } from '$app/stores';
  export let data: { user: { email: string; role?: string; display_name?: string } | null };

  $: onLogin = $page.url.pathname.startsWith('/admin/login');
  $: isAdmin = data.user?.role === 'admin';
</script>

{#if data.user && !onLogin}
  <header class="admin-bar">
    <div class="admin-bar__brand">
      <span class="admin-bar__tag">CURADURÍA</span>
      <nav class="admin-nav" aria-label="Panel de curaduría">
        <a href="/admin" class:active={$page.url.pathname === '/admin'}>Panel</a>
        <a href="/admin/pacientes" class:active={$page.url.pathname.startsWith('/admin/pacientes')}>Pacientes</a>
        <a href="/admin/cambios" class:active={$page.url.pathname.startsWith('/admin/cambios')}>Cambios</a>
        <a href="/admin/retiros" class:active={$page.url.pathname.startsWith('/admin/retiros')}>Retiros</a>
        {#if isAdmin}
          <a href="/admin/usuarios" class:active={$page.url.pathname.startsWith('/admin/usuarios')}>Colaboradores</a>
        {/if}
      </nav>
    </div>
    <div class="admin-bar__user">
      <span class="admin-bar__who">
        {data.user.display_name || data.user.email}
        <em class="role-chip">{data.user.role === 'admin' ? 'admin' : 'editor'}</em>
      </span>
      <form method="POST" action="/admin/login?/logout">
        <button class="button-brutal button-brutal--ghost" type="submit">Salir</button>
      </form>
    </div>
  </header>
{/if}

<div class="admin-content">
  <slot />
</div>

<style>
  .admin-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.8rem 1rem;
    background: #0c0c0c;
    border-bottom: 2px solid var(--accent-yellow, #f5c518);
  }
  .admin-bar__brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .admin-bar__tag {
    font-family: var(--mono);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    color: var(--accent-yellow, #f5c518);
    border: 1px solid var(--line);
    padding: 0.2rem 0.45rem;
    border-radius: 3px;
  }
  .admin-nav {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .admin-nav a {
    font-family: var(--mono);
    font-size: 0.85rem;
    text-decoration: none;
    color: var(--text-muted);
    padding: 0.45rem 0.7rem;
    border-radius: 3px;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .admin-nav a:hover {
    background: #1a1a1a;
    color: white;
  }
  .admin-nav a.active {
    color: #0c0c0c;
    background: var(--accent-yellow, #f5c518);
    font-weight: bold;
  }
  .admin-bar__user {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
  .admin-bar__who {
    font-size: 0.8rem;
    color: var(--text-dim);
  }
  .role-chip {
    font-family: var(--mono);
    font-style: normal;
    font-size: 0.7rem;
    color: var(--accent-orange);
    margin-left: 0.3rem;
  }
  .admin-content {
    padding: 1rem;
    max-width: 1100px;
    margin: 0 auto;
  }
</style>
