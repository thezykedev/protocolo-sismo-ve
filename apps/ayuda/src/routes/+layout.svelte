<script lang="ts">
  import { page } from '$app/stores';
  import { helpNavItems } from '$lib/navigation';
  import '../app.css';

  const isExternal = (href: string) => /^https?:\/\//.test(href);
</script>

<svelte:head>
  <meta name="theme-color" content="#ffff00" />
  <meta name="color-scheme" content="dark" />
</svelte:head>

<header class="topbar">
  <a class="brand" href="/" aria-label="Ir al inicio">
    <span class="brand__mark" aria-hidden="true">SV</span>
    <span class="brand__meta">
      <span>Sismo VE</span>
      <span>Ayuda online</span>
    </span>
  </a>

  <div class="header-stack">
    <div class="status-strip" aria-live="polite">
      <span class="status-strip__dot" aria-hidden="true"></span>
      <span>Online-first, sin cache de datos vivos</span>
    </div>

    <nav class="site-nav" aria-label="Secciones">
      {#each helpNavItems as item}
        <a
          class="site-nav__link"
          class:site-nav__link--active={!isExternal(item.href) && $page.url.pathname === item.href}
          href={item.href}
          target={isExternal(item.href) ? '_blank' : undefined}
          rel={isExternal(item.href) ? 'noreferrer' : undefined}
        >
          {item.label}
        </a>
      {/each}
    </nav>
  </div>
</header>

<main class="page-shell">
  <slot />
</main>

<footer class="site-footer">
  <p>
    La información viva se revisa en la plataforma online. Los registros verificados aparecerán
    solo después de revisión editorial.
  </p>
  <p>Contacto editorial: <a href="mailto:info@sismo-ve.xyz">info@sismo-ve.xyz</a></p>
  <p><a href="https://sismo-ve.xyz">Volver a la PWA esencial</a></p>
</footer>
