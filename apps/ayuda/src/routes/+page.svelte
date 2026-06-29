<script lang="ts">
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';

  export let data: {
    latest: {
      id: string;
      source: string;
      source_url: string;
      place: string;
      event_time: string;
      magnitude: number;
      magnitude_type?: string;
      depth_km?: number;
      review_status?: string;
    } | null;
    activity: {
      count24h: number;
      maxMagnitude24h: number | null;
    };
    snapshot: {
      lastSuccessfulAt: string | null;
      source: string;
      degraded: boolean;
    };
  };

  // Reloj reactivo para que el "hace X" avance aunque no llegue dato nuevo.
  let now = Date.now();

  onMount(() => {
    const clock = setInterval(() => (now = Date.now()), 30_000);
    // Refresco de datos del servidor: re-ejecuta el load sin recargar la página.
    const poll = setInterval(() => invalidateAll(), 60_000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  });

  function magColor(magnitude: number): string {
    return magnitude >= 6.5 ? '#ff3300' : magnitude >= 5.0 ? '#ff8800' : magnitude >= 4.0 ? '#ffcc00' : '#00cc66';
  }

  function timeAgo(iso: string, ref: number): string {
    const diffMs = ref - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60_000);
    if (min < 1) return 'Hace instantes';
    if (min < 60) return `Hace ${min} min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    const days = Math.floor(hrs / 24);
    return `Hace ${days} d`;
  }

  function sourceLabel(source: string): string {
    if (source === 'multiple') return 'Múltiples fuentes';
    if (source === 'cached') return 'Cache local';
    if (source === 'emsc') return 'EMSC';
    if (source === 'usgs') return 'USGS';
    if (source === 'geofon') return 'GEOFON';
    if (source === 'funvisis') return 'FUNVISIS';
    if (source === 'sgc') return 'SGC Colombia';
    return source.toUpperCase();
  }

  $: latest = data.latest;
  $: lastSync = data.snapshot.lastSuccessfulAt
    ? new Date(data.snapshot.lastSuccessfulAt).toLocaleTimeString('es-VE', {
        timeZone: 'America/Caracas',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  const modules = [
    {
      href: '/pacientes',
      icon: 'person_search',
      title: 'Personas',
      description: 'Buscar y reportar el estado de personas. Cédulas protegidas en la vista pública.'
    },
    {
      href: '/hospitales',
      icon: 'local_hospital',
      title: 'Hospitales',
      description: 'Centros de atención y notas de capacidad aportadas por la comunidad.'
    },
    {
      href: '/centros',
      icon: 'home_health',
      title: 'Refugios y acopio',
      description: 'Puntos de ayuda, refugios y necesidades logísticas activas.'
    },
    {
      href: '/aliados',
      icon: 'diversity_3',
      title: 'Aliados',
      description: 'Red de organizaciones y sitios que colaboran en la respuesta.'
    }
  ];
</script>

<svelte:head>
  <title>Plataforma de Ayuda | Sismo VE</title>
  <meta
    name="description"
    content="Coordinación ciudadana para la gestión de pacientes, hospitales y centros de acopio ante sismos en Venezuela."
  />
</svelte:head>

<section class="hero-panel hero-panel--framed">
  <p class="eyebrow">RED DE APOYO</p>
  <h1 class="page-title">Plataforma<br />de Ayuda</h1>
  <p class="hero-command">
    <span>Informar</span>
    <span class="hero-command__sep" aria-hidden="true">·</span>
    <span>Consultar</span>
    <span class="hero-command__sep" aria-hidden="true">·</span>
    <span>Verificar</span>
  </p>
  <p class="page-lead">
    Coordinación ciudadana para localizar personas y canalizar recursos. La información es
    revisada continuamente por la comunidad y el equipo editorial.
  </p>
</section>

<!-- Último sismo en vivo -->
<section class="content-grid content-grid--lead" aria-label="Último sismo registrado">
  {#if latest}
    <a href="/sismos" class="lead-quake" style={`--mag-color: ${magColor(latest.magnitude)};`}>
      <article>
        <div class="lead-quake__head">
          <span class="lead-quake__status">ÚLTIMO EVENTO</span>
          <span class="lead-quake__live" aria-hidden="true">
            <span class="lead-quake__pulse"></span> EN VIVO
          </span>
        </div>
        <div class="lead-quake__body">
          <div class="lead-quake__mag">
            <span>{latest.magnitude.toFixed(1)}</span>
            <small>{latest.magnitude_type ?? 'mag'}</small>
          </div>
          <div class="lead-quake__detail">
            <h2>{latest.place}</h2>
            <div class="lead-quake__metrics">
              <div>
                <span>Cuándo</span>
                <strong>{timeAgo(latest.event_time, now)}</strong>
              </div>
              <div>
                <span>Profundidad</span>
                <strong>{latest.depth_km != null ? `${Math.round(latest.depth_km)} km` : 'N/D'}</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{latest.review_status === 'reviewed' ? 'Revisado' : 'Automático'}</strong>
              </div>
            </div>
          </div>
        </div>
        <div class="lead-quake__foot">
          <span>Fuente: {sourceLabel(latest.source)}</span>
          <span class="lead-quake__cta">Ver mapa y eventos →</span>
        </div>
      </article>
    </a>
  {:else}
    <a href="/sismos" class="lead-quake lead-quake--empty">
      <article>
        <span class="lead-quake__status">MONITOREO SÍSMICO</span>
        <p>Sin eventos recientes disponibles. Abrir el monitoreo de sismos.</p>
        <span class="lead-quake__cta">Ver mapa y eventos →</span>
      </article>
    </a>
  {/if}

  <aside class="activity-panel" aria-label="Resumen de actividad sísmica">
    <div class="activity-panel__head">
      <h2 class="panel__title">Actividad 24h</h2>
      <span class="status-chip" class:status-chip--warning={data.snapshot.degraded}>
        {data.snapshot.degraded ? 'Cache' : 'En línea'}
      </span>
    </div>
    <div class="stat-grid">
      <div class="stat-tile">
        <span class="material-symbols-outlined stat-tile__icon" aria-hidden="true">sensors</span>
        <strong>{data.activity.count24h}</strong>
        <span>Eventos últimas 24h</span>
      </div>
      <div class="stat-tile">
        <span class="material-symbols-outlined stat-tile__icon" aria-hidden="true">speed</span>
        <strong>{data.activity.maxMagnitude24h != null ? `M ${data.activity.maxMagnitude24h.toFixed(1)}` : '—'}</strong>
        <span>Mayor magnitud 24h</span>
      </div>
    </div>
    <p class="muted-note">
      {#if data.snapshot.degraded}
        Fuentes sin respuesta. Se muestra la última lectura en cache.
      {:else if lastSync}
        Sincronizado a las {lastSync} (HLV). Réplicas pequeñas incluidas.
      {:else}
        Datos de EMSC, USGS y GEOFON. Réplicas pequeñas incluidas.
      {/if}
    </p>
  </aside>
</section>

<!-- Instalar PWA offline -->
<section class="install-cta">
  <span class="material-symbols-outlined install-cta__icon" aria-hidden="true">wifi_off</span>
  <div class="install-cta__text">
    <h2>Guía de emergencia sin conexión</h2>
    <p>
      Protocolos, contactos y lista de mochila que funcionan aunque te quedes sin señal.
      Instala la app esencial: tras la primera carga sigue disponible offline.
    </p>
  </div>
  <a class="install-cta__button" href="https://sismo-ve.xyz" target="_blank" rel="noreferrer">
    <span class="material-symbols-outlined" aria-hidden="true">download</span>
    Instalar app offline
  </a>
</section>

<!-- Módulos -->
<section class="content-grid" aria-label="Módulos de la plataforma">
  {#each modules as module}
    <a href={module.href} class="module-link">
      <div class="data-card" style="height: 100%;">
        <div class="data-card__head">
          <h3 class="data-card__title">
            <span class="material-symbols-outlined" style="color: var(--yellow);">{module.icon}</span>
            {module.title}
          </h3>
        </div>
        <div class="data-card__body">
          <p class="module-link__desc">{module.description}</p>
          <span class="module-link__cta">Abrir →</span>
        </div>
      </div>
    </a>
  {/each}
</section>

<!-- Acciones secundarias -->
<section class="link-grid" style="margin-top: 1rem;">
  <a class="utility-trigger" href="/correcciones" style="justify-content: center; height: 100%;">
    <span class="material-symbols-outlined" aria-hidden="true">rule</span> Reportar corrección
  </a>
  <a class="utility-trigger" href="/apoyar" style="justify-content: center; height: 100%;">
    <span class="material-symbols-outlined" aria-hidden="true">volunteer_activism</span> ¿Cómo ayudar?
  </a>
</section>

<section class="split-panel">
  <div class="split-panel__head">
    <h2 class="panel__title">Datos comunitarios</h2>
    <span class="material-symbols-outlined module-card__icon" aria-hidden="true">groups</span>
  </div>
  <p class="muted-note">
    Datos aportados por la comunidad (crowdsourced) y minimizados para protección de identidad. La ruta de corrección
    permite ajustar inconsistencias o solicitar el borrado de la información de manera inmediata.
  </p>
  <div class="stat-grid">
    <div class="stat-tile">
      <span class="material-symbols-outlined stat-tile__icon" aria-hidden="true">badge</span>
      <strong>Privacidad</strong>
      <span>Sin cédulas completas en la vista pública.</span>
    </div>
    <div class="stat-tile">
      <span class="material-symbols-outlined stat-tile__icon" aria-hidden="true">cached</span>
      <strong>Actualizado</strong>
      <span>Los datos se refrescan continuamente.</span>
    </div>
    <div class="stat-tile">
      <span class="material-symbols-outlined stat-tile__icon" aria-hidden="true">travel_explore</span>
      <strong>Cobertura nacional</strong>
      <span>Sismos recientes sin ocultar réplicas pequeñas.</span>
    </div>
  </div>
</section>

<style>
  .content-grid--lead {
    grid-template-columns: 2fr 1fr;
    margin-top: 2rem;
  }

  @media (max-width: 760px) {
    .content-grid--lead {
      grid-template-columns: 1fr;
    }
  }

  /* Tarjeta del último sismo */
  .lead-quake {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .lead-quake > article {
    height: 100%;
    border: 2px solid var(--line);
    border-left: 6px solid var(--mag-color, var(--orange));
    background: #141312;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }

  .lead-quake:hover > article,
  .lead-quake:focus-visible > article {
    border-color: var(--mag-color, var(--yellow));
    transform: translateY(-2px);
  }

  .lead-quake__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .lead-quake__status {
    font-family: var(--mono);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    background: var(--mag-color, var(--orange));
    color: #111;
    padding: 0.25rem 0.6rem;
  }

  .lead-quake__live {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--mag-color, var(--orange));
  }

  .lead-quake__pulse {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--mag-color, var(--orange));
    animation: pulse 1.6s ease-in-out infinite;
  }

  .lead-quake__body {
    display: flex;
    gap: 1.25rem;
    align-items: center;
  }

  .lead-quake__mag {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
  }

  .lead-quake__mag span {
    font-family: var(--mono);
    font-size: 3.4rem;
    font-weight: 800;
    color: var(--mag-color, var(--orange));
  }

  .lead-quake__mag small {
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--text-muted, #b9b9b9);
    text-transform: uppercase;
  }

  .lead-quake__detail {
    flex: 1;
    min-width: 0;
  }

  .lead-quake__detail h2 {
    margin: 0 0 0.75rem;
    font-size: 1.15rem;
    line-height: 1.25;
  }

  .lead-quake__metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
  }

  .lead-quake__metrics div {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .lead-quake__metrics span {
    font-family: var(--mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted, #b9b9b9);
  }

  .lead-quake__metrics strong {
    font-size: 1rem;
  }

  .lead-quake__foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--line-soft);
    padding-top: 0.75rem;
    font-family: var(--mono);
    font-size: 0.74rem;
    color: var(--text-muted, #b9b9b9);
  }

  .lead-quake__cta {
    color: var(--yellow);
    font-weight: 700;
  }

  .lead-quake--empty > article {
    border-left-color: var(--line);
    justify-content: center;
    gap: 0.75rem;
  }

  /* Panel de actividad */
  .activity-panel {
    border: 2px solid var(--line);
    background: #141312;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .activity-panel__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* CTA de instalación PWA */
  .install-cta {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
    border: 2px solid var(--yellow);
    background: linear-gradient(120deg, #1a1813, #141312);
    padding: 1.25rem 1.5rem;
    margin-top: 1rem;
  }

  .install-cta__icon {
    font-size: 2.5rem;
    color: var(--yellow);
    flex-shrink: 0;
  }

  .install-cta__text {
    flex: 1;
    min-width: 14rem;
  }

  .install-cta__text h2 {
    margin: 0 0 0.35rem;
    font-size: 1.1rem;
  }

  .install-cta__text p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
    color: var(--text-muted, #c4c4c4);
  }

  .install-cta__button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0 1.25rem;
    background: var(--yellow);
    color: #111;
    font-family: var(--mono);
    font-weight: 800;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-decoration: none;
    border: 2px solid #111;
    flex-shrink: 0;
  }

  .install-cta__button:hover,
  .install-cta__button:focus-visible {
    background: #fff;
  }

  /* Módulos como navegación */
  .module-link {
    text-decoration: none;
    color: inherit;
  }

  .data-card__title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .module-link__desc {
    margin: 0 0 0.75rem;
    font-size: 0.88rem;
    line-height: 1.45;
    color: var(--text-muted, #c4c4c4);
  }

  .module-link__cta {
    margin-top: auto;
    font-family: var(--mono);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--yellow);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(1.4); }
  }

  @media (prefers-reduced-motion: reduce) {
    .lead-quake__pulse {
      animation: none;
    }
    .lead-quake:hover > article,
    .lead-quake:focus-visible > article {
      transform: none;
    }
  }
</style>
