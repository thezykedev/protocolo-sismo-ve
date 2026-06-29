<script lang="ts">
  export let label = 'Cargando mapa';
  export let sublabel = 'Inicializando capas del mapa';
</script>

<div class="map-loader" role="status" aria-live="polite">
  <div class="map-loader__scene" aria-hidden="true">
    <span class="map-loader__ring"></span>
    <span class="map-loader__ring"></span>
    <span class="map-loader__ring"></span>
    <span class="map-loader__core"></span>
  </div>

  <div class="map-loader__text">
    <p class="map-loader__label">{label}</p>
    {#if sublabel}
      <p class="map-loader__sub">{sublabel}</p>
    {/if}
  </div>

  <div class="map-loader__bar" aria-hidden="true"><span></span></div>
</div>

<style>
  .map-loader {
    position: absolute;
    inset: 0;
    z-index: 15;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.4rem;
    padding: 1.5rem;
    text-align: center;
    background:
      radial-gradient(circle at 50% 40%, rgba(255, 204, 0, 0.08), transparent 62%),
      #121212;
  }

  /* Epicentro + ondas sísmicas concéntricas */
  .map-loader__scene {
    position: relative;
    display: grid;
    place-items: center;
    width: 88px;
    height: 88px;
  }

  .map-loader__ring {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 20px;
    height: 20px;
    border: 2px solid var(--yellow);
    border-radius: 50%;
    opacity: 0;
    animation: map-loader-ping 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }

  .map-loader__ring:nth-child(2) {
    animation-delay: 0.6s;
    border-color: var(--orange);
  }

  .map-loader__ring:nth-child(3) {
    animation-delay: 1.2s;
  }

  .map-loader__core {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--yellow);
    box-shadow: 0 0 0 5px rgba(255, 204, 0, 0.16);
    animation: map-loader-core 1.8s ease-in-out infinite;
  }

  @keyframes map-loader-ping {
    0% {
      transform: scale(0.35);
      opacity: 0.9;
    }
    70% {
      opacity: 0.14;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes map-loader-core {
    0%,
    100% {
      transform: scale(0.82);
    }
    50% {
      transform: scale(1.18);
    }
  }

  .map-loader__text {
    display: grid;
    gap: 0.3rem;
  }

  .map-loader__label {
    margin: 0;
    font-family: var(--mono);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #f4f4f4;
  }

  .map-loader__sub {
    margin: 0;
    font-family: var(--mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted, #9a9a9a);
  }

  /* Barra indeterminada */
  .map-loader__bar {
    position: relative;
    width: min(220px, 64%);
    height: 4px;
    overflow: hidden;
    background: #262626;
    border: 1px solid var(--line-soft, #333);
  }

  .map-loader__bar span {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -40%;
    width: 40%;
    background: var(--yellow);
    animation: map-loader-bar 1.25s ease-in-out infinite;
  }

  @keyframes map-loader-bar {
    0% {
      left: -40%;
    }
    100% {
      left: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .map-loader__ring {
      animation: none;
      transform: scale(2.2);
      opacity: 0.4;
    }
    .map-loader__ring:nth-child(2),
    .map-loader__ring:nth-child(3) {
      display: none;
    }
    .map-loader__core {
      animation: none;
    }
    .map-loader__bar span {
      animation: none;
      left: 0;
      width: 100%;
      opacity: 0.6;
    }
  }
</style>
