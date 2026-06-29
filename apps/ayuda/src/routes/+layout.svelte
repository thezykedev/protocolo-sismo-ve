<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { helpNavItems } from '$lib/navigation';
  import '../app.css';

  export let data: { backend?: { degraded: boolean; snapshotAt: string | null } } = {};

  const isExternal = (href: string) => /^https?:\/\//.test(href);
  const primaryNavIds = new Set(['inicio', 'pacientes', 'centros', 'sismos']);

  let moreOpen = false;
  let syncTime = '';

  $: primaryNavItems = helpNavItems.filter((item) => primaryNavIds.has(item.id));
  $: utilityNavItems = helpNavItems.filter((item) => !primaryNavIds.has(item.id));
  $: activePath = $page.url.pathname;
  $: degraded = data.backend?.degraded ?? false;
  $: snapshotTime = data.backend?.snapshotAt
    ? new Date(data.backend.snapshotAt).toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  const isActive = (href: string) => {
    if (isExternal(href)) return false;
    if (href === '/') return activePath === '/';
    return activePath === href || activePath.startsWith(`${href}/`);
  };

  const closeMore = () => {
    moreOpen = false;
  };

  onMount(() => {
    const now = new Date();
    syncTime = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  });
</script>

<svelte:head>
  <meta name="theme-color" content="#ffff00" />
  <meta name="color-scheme" content="dark" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
  />
</svelte:head>

<header class="topbar">
  <a class="brand" href="/" aria-label="Ir al inicio">
    <img class="brand__mark" src="/logo-mark.svg" alt="" aria-hidden="true" />
    <span class="brand__meta">
      <span>Sismo VE</span>
    </span>
  </a>

  <nav class="site-nav" aria-label="Secciones principales">
    {#each primaryNavItems as item}
      <a
        class="site-nav__link"
        class:site-nav__link--active={isActive(item.href)}
        href={item.href}
      >
        {item.label}
      </a>
    {/each}
  </nav>

  <div class="topbar__actions">
    {#if degraded}
      <span class="online-chip online-chip--degraded" title="PocketBase no responde: se muestra el último snapshot guardado">
        <span class="material-symbols-outlined" style="font-size: 1.1em; margin-right: 0.35rem;" aria-hidden="true">cloud_off</span>
        Cache <span style="opacity: 0.7; font-weight: 400; margin-left: 0.5rem; font-size: 0.9em; text-transform: none; letter-spacing: normal;">{snapshotTime ? `(snapshot ${snapshotTime})` : '(sin snapshot)'}</span>
      </span>
    {:else}
      <span class="online-chip" title="Estado de la conexión a datos">
        <span class="material-symbols-outlined" style="font-size: 1.1em; margin-right: 0.35rem;" aria-hidden="true">sensors</span>
        En línea <span style="opacity: 0.6; font-weight: 400; margin-left: 0.5rem; font-size: 0.9em; text-transform: none; letter-spacing: normal;">{syncTime ? `(act. ${syncTime})` : ''}</span>
      </span>
    {/if}
    <button
      class="utility-trigger"
      class:utility-trigger--active={moreOpen}
      type="button"
      aria-expanded={moreOpen}
      aria-controls="more-panel"
      on:click={() => (moreOpen = !moreOpen)}
    >
      <span class="nav-icon nav-icon--more" aria-hidden="true"></span>
      Más
    </button>
  </div>
</header>

<main class="page-shell">
  <slot />
</main>

{#if moreOpen}
  <aside class="more-panel" id="more-panel" aria-label="Más secciones">
    <div class="more-panel__head">
      <span>Más</span>
      <button class="icon-button" type="button" aria-label="Cerrar menú" on:click={closeMore}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <div class="more-panel__grid">
      {#each utilityNavItems as item}
        <a
          class="more-panel__link"
          class:more-panel__link--active={isActive(item.href)}
          href={item.href}
          target={isExternal(item.href) ? '_blank' : undefined}
          rel={isExternal(item.href) ? 'noreferrer' : undefined}
          on:click={closeMore}
        >
          <span class={`nav-icon nav-icon--${item.id}`} aria-hidden="true"></span>
          <span>
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </span>
        </a>
      {/each}
    </div>
  </aside>
{/if}

<nav class="bottom-nav" aria-label="Navegación principal móvil">
  {#each primaryNavItems as item}
    <a class="bottom-nav__item" class:bottom-nav__item--active={isActive(item.href)} href={item.href}>
      <span class={`nav-icon nav-icon--${item.id}`} aria-hidden="true"></span>
      <span>{item.label}</span>
    </a>
  {/each}
  <button
    class="bottom-nav__item bottom-nav__item--button"
    class:bottom-nav__item--active={moreOpen || utilityNavItems.some((item) => isActive(item.href))}
    type="button"
    aria-expanded={moreOpen}
    aria-controls="more-panel"
    on:click={() => (moreOpen = !moreOpen)}
  >
    <span class="nav-icon nav-icon--more bottom-nav__more-icon" aria-hidden="true"></span>
    <span>Más</span>
  </button>
</nav>

<footer class="site-footer">
  <p>
    Toda la información es crowdsourced y provista por la comunidad. Se publica tal cual sin verificación oficial.
  </p>
  <p>Solicitud de corrección o borrado: <a href="mailto:info@sismo-ve.xyz">info@sismo-ve.xyz</a></p>
  <p><a href="https://sismo-ve.xyz">Abrir guía offline esencial</a></p>
</footer>

<style>
  .online-chip--degraded {
    border-color: var(--orange);
    color: var(--orange);
  }
</style>
