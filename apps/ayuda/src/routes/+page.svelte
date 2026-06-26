<script lang="ts">
  import RecordCard from '$lib/components/RecordCard.svelte';

  const entryPoints = [
    {
      title: 'Pacientes',
      description: 'Registros públicos minimizados con `cedula_last3`, revisión y corrección.',
      meta: 'No publicar cédulas completas',
      href: '/pacientes'
    },
    {
      title: 'Hospitales',
      description: 'Coordinación hospitalaria y cambios operativos con prioridad online.',
      meta: 'Cache corto, revisión frecuente',
      href: '/hospitales'
    },
    {
      title: 'Centros',
      description: 'Centros de acopio, albergues y logística con mapa Leaflet.',
      meta: 'Solo registros aprobados',
      href: '/centros'
    },
    {
      title: 'Sismos',
      description: 'Eventos recientes de Venezuela con filtros por tiempo y magnitud.',
      meta: 'Sin ocultar réplicas pequeñas',
      href: '/sismos'
    },
    {
      title: 'Correcciones',
      description: 'Solicitudes de retiro y ajuste de datos sensibles o erróneos.',
      meta: 'Ruta visible para correcciones',
      href: '/correcciones'
    },
    {
      title: 'Apoyar',
      description: 'Donaciones, transparencia y separación total de flujos de emergencia.',
      meta: 'Fuera de la captura de pacientes',
      href: '/apoyar'
    }
  ];
</script>

<svelte:head>
  <title>Ayuda online | Sismo VE</title>
  <meta
    name="description"
    content="Plataforma online de Sismo VE para pacientes, hospitales, centros, aliados, sismos y correcciones."
  />
</svelte:head>

<section class="hero-panel">
  <p class="eyebrow">PLATAFORMA ONLINE</p>
  <h1 class="page-title">
    <span class="hero-command">
      <span>CONSULTAR</span>
      <span class="hero-command__sep" aria-hidden="true">·</span>
      <span>REVISAR</span>
      <span class="hero-command__sep" aria-hidden="true">·</span>
      <span>ACTUALIZAR</span>
    </span>
  </h1>
  <p class="page-lead">
    Esta capa mantiene los datos vivos fuera de la PWA offline. Aquí viven los registros públicos,
    las solicitudes de corrección, la coordinación operativa y los mapas que cambian con
    frecuencia.
  </p>
</section>

<section class="metric-grid" aria-label="Accesos principales">
  {#each entryPoints as entry}
    <RecordCard title={entry.title} description={entry.description} meta={entry.meta} href={entry.href} status="Abrir" tone="verified" />
  {/each}
</section>

<section class="panel">
  <div class="panel__head">
    <h2 class="panel__title">Criterio editorial</h2>
    <span class="panel__meta">PWA esencial / online-first</span>
  </div>
  <div class="content-grid">
    <div class="surface">
      <p class="muted-note">
        Los pacientes usan minimización de datos: nombre, hospital, estado público y
        <code>cedula_last3</code>.
      </p>
    </div>
    <div class="surface">
      <p class="muted-note">
        Los eventos sísmicos se normalizan desde fuentes externas y se muestran con filtros por
        tiempo y magnitud.
      </p>
    </div>
    <div class="surface">
      <p class="muted-note">
        Las solicitudes de retiro y corrección permanecen visibles para facilitar revisión,
        trazabilidad y respuesta.
      </p>
    </div>
  </div>
</section>
